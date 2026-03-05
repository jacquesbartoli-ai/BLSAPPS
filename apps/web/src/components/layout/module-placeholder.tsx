type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-2 text-xl font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-foreground/80">{description}</p>
      <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm">
        Structure UI prête. API + logique métier à brancher dans ce module.
      </div>
    </section>
  );
}
