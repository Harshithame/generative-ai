"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Music } from "lucide-react";

import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Loader } from "@/components/loader";
import { Musics } from "@/components/ui/empty";
import { useProModal } from "@/hooks/use-pro-modal";

import { formSchema } from "./constants";

const MusicPage = () => {
  const proModal = useProModal();
  const router = useRouter();
  const [music, setMusic] = useState<string>();
  const [audioError, setAudioError] = useState<string>();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setMusic(undefined);

      console.log("Submitting with values:", values);
      const response = await axios.post("/api/music", values);
      console.log("Client received response:", response.data);

      let audioUrl = null;

      // Handle the response flexibly, similar to video generation
      if (response.data?.url && typeof response.data.url === "string") {
        // Standard format with url property
        audioUrl = response.data.url;
      } else if (
        response.data?.audio &&
        typeof response.data.audio === "string"
      ) {
        // Legacy format with audio property for backward compatibility
        audioUrl = response.data.audio;
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        // Handle array response
        audioUrl = response.data[0];
      } else if (
        typeof response.data === "string" &&
        response.data.startsWith("http")
      ) {
        // Direct string URL response
        audioUrl = response.data;
      }

      if (!audioUrl) {
        console.error("Invalid response format:", response.data);
        toast.error("Failed to generate audio. Please try again.");
        return;
      }

      // Verify the URL is valid
      if (!audioUrl.startsWith("http")) {
        console.error("Invalid audio URL:", audioUrl);
        toast.error("Invalid audio URL received. Please try again.");
        return;
      }

      setMusic(audioUrl);
      toast.success("Music generated successfully!");
      form.reset();
    } catch (error: any) {
      console.error("Error:", error);

      if (error?.response?.status === 403) {
        proModal.onOpen();
      } else {
        toast.error(
          `Error: ${
            error?.response?.data || error?.message || "Something went wrong"
          }`
        );
      }
    } finally {
      router.refresh();
    }
  };

  return (
    <div>
      <Heading
        title="Music Generation"
        description="Turn your prompt into music using MusicGen."
        icon={Music}
        iconColor="text-emerald-500"
        bgColor="bg-emerald-500/10"
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
                      placeholder="Chill music with acoustic guitar and piano"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              className="col-span-12 lg:col-span-2 w-full "
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
        {!music && !isLoading && <Musics label="No music generated." />}
        {audioError && (
          <div className="p-4 text-red-500 text-center">{audioError}</div>
        )}
        {music && (
          <div className="mt-8">
            <audio
              controls
              className="w-full"
              src={music}
              onError={(e) => {
                console.error("[AUDIO_LOAD_ERROR]", e);
                setAudioError(
                  "Failed to load the audio. Please try regenerating."
                );
                setMusic(undefined);
              }}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicPage;
