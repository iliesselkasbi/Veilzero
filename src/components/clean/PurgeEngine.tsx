import Button from "@/components/ui/Button";

interface Props {
  disabled: boolean;
  purging: boolean;
  count: number;
  onPurge: () => void;
}

export default function PurgeEngine({ disabled, purging, count, onPurge }: Props) {
  let label = "Clean file";
  if (purging) label = "Purging identifying data…";
  else if (count > 0) label = `Purge ${count} identifying threat${count === 1 ? "" : "s"}`;
  else label = "Verify & prepare export";

  return (
    <Button onClick={onPurge} disabled={disabled || purging} className="w-full">
      {label}
    </Button>
  );
}