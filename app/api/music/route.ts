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

    console.log("[MUSIC_REQUEST] Starting with prompt:", prompt);

    // Using the exact parameters provided
    const input = {
      top_k: 250,
      top_p: 0,
      prompt: prompt,
      duration: 20,
      temperature: 1,
      continuation: false,
      output_format: "wav",
      continuation_start: 0,
      multi_band_diffusion: false,
      normalization_strategy: "loudness",
      classifier_free_guidance: 3,
    };

    // Call the Replicate API with the exact model and format provided
    const output: any = await replicate.run(
      "ardianfe/music-gen-fn-200e:96af46316252ddea4c6614e31861876183b59dce84bad765f38424e87919dd85",
      {
        input,
      }
    );

    // Log the complete output for debugging
    console.log("[MUSIC_RESPONSE] Output type:", typeof output);
    console.log("[MUSIC_RESPONSE] Output:", output);

    if (!isPro) {
      await incrementApiLimit();
    }

    // Process the response similar to video generation
    let audioUrl = null;

    if (Array.isArray(output) && output.length > 0) {
      // Handle array response - typically the first item is the URL
      audioUrl = output[0];
      console.log("[MUSIC_RESPONSE] Extracted URL from array:", audioUrl);
    } else if (output && typeof output === "object" && "url" in output) {
      // Handle object response with url property
      if (typeof output.url === "function") {
        try {
          // If url is a function, call it to get the actual URL
          audioUrl = output.url();
          console.log("[MUSIC_RESPONSE] Called URL function, got:", audioUrl);
        } catch (e) {
          console.error("[MUSIC_RESPONSE] Error calling URL function:", e);
        }
      } else {
        audioUrl = output.url;
        console.log(
          "[MUSIC_RESPONSE] Extracted URL from object property:",
          audioUrl
        );
      }
    } else if (output && typeof output === "object" && "audio" in output) {
      // Handle object response with audio property
      audioUrl = output.audio;
      console.log(
        "[MUSIC_RESPONSE] Extracted URL from audio property:",
        audioUrl
      );
    } else if (typeof output === "string" && output.startsWith("http")) {
      // Handle direct string URL response
      audioUrl = output;
      console.log("[MUSIC_RESPONSE] Using direct string URL:", audioUrl);
    }

    if (!audioUrl) {
      console.error("[MUSIC_ERROR] No valid URL found in output", output);
      return new NextResponse("Failed to generate audio URL", { status: 500 });
    }

    // Return the response with a consistent structure - use url property to match video generation
    const response = { url: audioUrl };
    console.log("[MUSIC_RESPONSE] Sending response to client:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.log("[MUSIC_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
