const alphabet = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];
const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function hideEUDText(text: string) {
  return text
    ? text
      .split("")
      .map((character) => {
        if (character === " ") return character;
        if (numbers.includes(character)) return hideSnowflake(character);

        const random = chooseRandom(alphabet);
        return alphabet.includes(character) ? random : random.toLowerCase();
      })
      .join("")
    : text;
}

export function hideSnowflake(snowflake: string) {
  return snowflake
    ? snowflake
      .split("")
      .map((_, index) => chooseRandom(index ? numbers : numbers.slice(1)))
      .join("")
    : snowflake;
}

export function hideHash(hash: string | null) {
  return hash
    ? `${hash.startsWith("a_") ? "a_" : ""}eae5905ad2d18d7c8deca20478b088b5`
    : hash;
}

export function hideDate() {
  return new Date().toISOString();
}

export function chooseRandom<T>(array: T[]) {
  return array[Math.floor(Math.random() * array.length)];
}

export function loopObject<T = {}>(
  obj: {},
  handler: (value: unknown, key: string) => unknown,
) {
  let res: Record<string, unknown> | unknown[] = {};

  if (Array.isArray(obj)) {
    res = [];

    for (const o of obj) {
      if (typeof o === "object" && !Array.isArray(o) && o !== null) {
        // A nested object
        res.push(loopObject(o as {}, handler));
      } else {
        res.push(handler(o, "array"));
      }
    }
  } else {
    for (const [key, value] of Object.entries(obj)) {
      if (
        Array.isArray(value) ||
        (typeof value === "object" &&
          !Array.isArray(value) &&
          value !== null &&
          !(value instanceof Blob))
      ) {
        // A nested object
        res[key] = loopObject(value as {}, handler);
      } else {
        res[key] = handler(value, key);
      }
    }
  }

  return res as T;
}
