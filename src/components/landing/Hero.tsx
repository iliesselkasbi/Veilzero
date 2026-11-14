import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-28 pb-20 text-center">
      <h1 className="font-display text-6xl sm:text-7xl font-bold tracking-[0.4em] pl-[0.4em]">VEILZERO</h1>
      <p className="mt-6 text-lg text-text-muted">Be seen. Not identified.</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button href="/live">VEILZERO LIVE</Button>
        <Button href="/clean" variant="secondary">
          VEILZERO CLEAN
        </Button>
      </div>
    </section>
  );
}
