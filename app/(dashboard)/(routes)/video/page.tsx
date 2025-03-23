"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { FileAudio } from "lucide-react";
import { useRouter } from "next/navigation";

import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Loader } from "@/components/loader";
import { Videos } from "@/components/ui/empty";
import { useProModal } from "@/hooks/use-pro-modal";

import { formSchema } from "./constants";

const VideoPage = () => {
  const router = useRouter();
  const proModal = useProModal();
  const [video, setVideo] = useState<string>();
  const [videoError, setVideoError] = useState<string>();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setVideo(undefined);
      setVideoError(undefined);

      const response = await axios.post("/api/video", values);
      console.log("Client received response:", response.data);

      let videoUrl = null;

      // Handle the response more flexibly
      if (response.data?.url && typeof response.data.url === "string") {
        // Standard format with url property
        videoUrl = response.data.url;
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        // Handle array response
        videoUrl = response.data[0];
      } else if (
        typeof response.data === "string" &&
        response.data.startsWith("http")
      ) {
        // Direct string URL response
        videoUrl = response.data;
      }

      if (!videoUrl) {
        console.error("Invalid response format:", response.data);
        throw new Error("Invalid response format from server");
      }

      // Verify the URL is valid
      if (!videoUrl.startsWith("http")) {
        console.error("Invalid video URL:", videoUrl);
        throw new Error("Invalid video URL received");
      }

      setVideo(videoUrl);
      form.reset();
    } catch (error: any) {
      if (error?.response?.status === 403) {
        proModal.onOpen();
      } else {
        const errorMessage =
          error?.response?.data ||
          error.message ||
          "Something went wrong generating the video.";
        console.error("[VIDEO_ERROR]", error);
        toast.error(errorMessage);
        setVideoError("Failed to generate video. Please try again.");
      }
    } finally {
      router.refresh();
    }
  };

  return (
    <div>
      <Heading
        title="Video Generation"
        description="Turn your prompt into video."
        icon={FileAudio}
        iconColor="text-orange-700"
        bgColor="bg-orange-700/10"
      />
      <div className="px-4 lg:px-8">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="
              rounded-lg 
              border 
              w-full 
              p-4 
              px-3 
              md:px-6 
              focus-within:shadow-sm
              grid
              grid-cols-12
              gap-2
            "
          >
            <FormField
              name="prompt"
              render={({ field }) => (
                <FormItem className="col-span-12 lg:col-span-10">
                  <FormControl className="m-0 p-0">
                    <Input
                      className="border-0 outline-none focus-visible:ring-0 focus-visible:ring-transparent"
                      disabled={isLoading}
                      placeholder="Clown fish swimming in a coral reef"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              className="col-span-12 lg:col-span-2 w-full"
              type="submit"
              disabled={isLoading}
              size="icon"
            >
              Generate
            </Button>
          </form>
        </Form>
        {isLoading && (
          <div className="p-20">
            <Loader />
          </div>
        )}
        {!video && !isLoading && <Videos label="No video files generated." />}
        {videoError && (
          <div className="p-4 text-red-500 text-center">{videoError}</div>
        )}
        {video && (
          <div className="mt-8">
            <video
              controls
              className="w-full aspect-video rounded-lg border bg-black"
              onError={(e) => {
                console.error("[VIDEO_LOAD_ERROR]", e);
                setVideoError(
                  "Failed to load the video. Please try regenerating."
                );
                setVideo(undefined);
              }}
            >
              <source src={video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPage;
