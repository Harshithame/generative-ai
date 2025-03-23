import Replicate from "replicate";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { prompt } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();

    if (!freeTrial && !isPro) {
      return new NextResponse(
        "Free trial has expired. Please upgrade to pro.",
        { status: 403 }
      );
    }

    console.log("[VIDEO_API] Running model with prompt:", prompt);
    const output: any = await replicate.run("luma/ray-flash-2-720p", {
      input: {
        prompt,
      },
    });

    // Log the complete output for debugging
    console.log("Full Replicate Response:", JSON.stringify(output, null, 2));
    console.log("Response type:", typeof output);
    if (Array.isArray(output)) {
      console.log("Response is array with length:", output.length);
    }

    // Process the response
    let videoUrl = null;

    if (Array.isArray(output) && output.length > 0) {
      // Handle array response - typically the first item is the video URL
      videoUrl = output[0];
      console.log("Extracted URL from array:", videoUrl);
    } else if (output && typeof output === "object" && "url" in output) {
      // Handle object response with url property
      if (typeof output.url === "function") {
        try {
          // If url is a function, call it to get the actual URL
          videoUrl = output.url();
          console.log("Called URL function, got:", videoUrl);
        } catch (e) {
          console.error("Error calling URL function:", e);
        }
      } else {
        videoUrl = output.url;
        console.log("Extracted URL from object property:", videoUrl);
      }
    } else if (typeof output === "string" && output.startsWith("http")) {
      // Handle direct string URL response
      videoUrl = output;
      console.log("Using direct string URL:", videoUrl);
    }

    if (!videoUrl) {
      // Fallback to a different model if we can't get a URL
      console.log("Attempting fallback to a different video model...");
      try {
        const fallbackOutput: any = await replicate.run(
          "anotherjesse/zeroscope-v2-xl:71996d331e8ede8ef7bd76eba9fae076d31792e4ddf4ad057779b443d6aea62f",
          { input: { prompt } }
        );
        console.log(
          "Fallback model response:",
          JSON.stringify(fallbackOutput, null, 2)
        );

        if (Array.isArray(fallbackOutput) && fallbackOutput.length > 0) {
          videoUrl = fallbackOutput[0];
          console.log("Using fallback URL:", videoUrl);
        }
      } catch (e) {
        console.error("Fallback model also failed:", e);
      }
    }

    if (!videoUrl) {
      console.error("[VIDEO_ERROR] No valid URL found in output", output);
      return new NextResponse("Failed to generate video URL", { status: 500 });
    }

    if (!isPro) {
      await incrementApiLimit();
    }

    // Return the response with a url property for consistent client handling
    const response = { url: videoUrl };
    console.log("Sending response to client:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[VIDEO_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
