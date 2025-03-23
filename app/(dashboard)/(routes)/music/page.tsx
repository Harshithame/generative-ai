"use client";

import * as z from "zod";
import axios from "axios";
import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  Music,
  Download,
  Rewind,
  FastForward,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Loader } from "@/components/loader";
import { Musics } from "@/components/ui/empty";
import { useProModal } from "@/hooks/use-pro-modal";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { formSchema } from "./constants";

const MusicPage = () => {
  const proModal = useProModal();
  const router = useRouter();
  const [music, setMusic] = useState<string>();
  const [audioError, setAudioError] = useState<string>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(1);

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

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (volume > 0) {
        audioRef.current.volume = 0;
        setVolume(0);
      } else {
        audioRef.current.volume = 1;
        setVolume(1);
      }
    }
  };

  const downloadAudio = () => {
    if (music) {
      const a = document.createElement("a");
      a.href = music;
      a.download = "generated-music.mp3";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
            <Card className="bg-black/5 dark:bg-white/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  <audio
                    ref={audioRef}
                    src={music}
                    className="hidden"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    onError={(e) => {
                      console.error("[AUDIO_LOAD_ERROR]", e);
                      setAudioError(
                        "Failed to load the audio. Please try regenerating."
                      );
                      setMusic(undefined);
                    }}
                  />

                  {/* Waveform visualization */}
                  <div className="w-full h-24 bg-emerald-500/10 rounded-md flex items-center justify-center overflow-hidden">
                    <div className="flex items-center justify-center h-full w-full relative">
                      {Array.from({ length: 40 }).map((_, i) => {
                        // Create a dynamic visualization
                        const height = isPlaying
                          ? 30 + Math.sin(i * 0.5 + currentTime) * 20
                          : 30;
                        return (
                          <div
                            key={i}
                            style={{
                              height: `${height}px`,
                              opacity: i % 2 === 0 ? 0.7 : 1,
                            }}
                            className="w-1 mx-[2px] bg-emerald-500 rounded-full transition-all duration-150"
                          />
                        );
                      })}
                      {!isPlaying && (
                        <div
                          className="absolute flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-full cursor-pointer transition-transform hover:scale-110 duration-200"
                          onClick={togglePlayPause}
                        >
                          <Play className="text-white h-6 w-6" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Playback controls */}
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSliderChange}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>
              </CardContent>
              <Separator />
              <CardFooter className="flex justify-between p-4">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full transition-all hover:scale-110 duration-200"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = Math.max(
                          0,
                          currentTime - 10
                        );
                      }
                    }}
                  >
                    <Rewind className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full transition-transform hover:scale-110 duration-200"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full transition-all hover:scale-110 duration-200"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = Math.min(
                          duration,
                          currentTime + 10
                        );
                      }
                    }}
                  >
                    <FastForward className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full transition-all hover:scale-110 duration-200"
                    onClick={toggleMute}
                  >
                    {volume > 0 ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full transition-all hover:scale-110 duration-200"
                    onClick={downloadAudio}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicPage;
