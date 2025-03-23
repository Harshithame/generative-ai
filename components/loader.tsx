import Image from "next/image";

export const Loader = () => {
  return (
    <div className="h-full flex flex-col gap-y-4 items-center justify-center">
      <div className="h-10 w-10 relative animate-pulse">
        <Image
          alt="Logo"
          src="/mlogo.png"
          fill
          sizes="(max-width: 40px) 100vw, 40px"
        />
      </div>
      <p className="text-sm text-muted-foreground">Genius is thinking...</p>
    </div>
  );
};
