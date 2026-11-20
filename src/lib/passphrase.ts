const WORDS = [
  "amber", "anchor", "atlas", "basil", "beacon", "birch", "bison", "bloom",
  "cedar", "cinder", "cobalt", "comet", "coral", "dawn", "delta", "ember",
  "falcon", "fern", "forest", "foxglove", "glacier", "granite", "harbor",
  "hazel", "heron", "hollow", "island", "jasmine", "juniper", "lantern",
  "laurel", "lunar", "maple", "marble", "meadow", "meteor", "moss",
  "night", "nova", "oak", "oasis", "olive", "orbit", "paper", "pebble",
  "pine", "pixel", "planet", "plume", "quartz", "reef", "river", "sage",
  "shadow", "silver", "solar", "sparrow", "spruce", "stone", "storm",
  "summit", "thistle", "tiger", "timber", "tulip", "valley", "violet",
  "willow", "winter", "wolf", "zephyr",
] as const;

export function generateSecureWordPassphrase(): string {
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / WORDS.length) * WORDS.length;
  const randomWord = () => {
    const value = new Uint32Array(1);
    do {
      crypto.getRandomValues(value);
    } while (value[0] >= limit);
    return WORDS[value[0] % WORDS.length];
  };

  return Array.from({ length: 6 }, () => `${randomWord()}-${randomWord()}`).join(" ");
}
