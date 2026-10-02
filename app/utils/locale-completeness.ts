type LocaleValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

type MissingLocalePaths = {
  missingFromSource: string[];
  missingFromTarget: string[];
};

function pathForChild(parent: string, child: string | number) {
  return typeof child === "number" ? `${parent}[${child}]` : parent ? `${parent}.${child}` : child;
}

function collectPaths(value: LocaleValue, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.length === 0
      ? []
      : value.flatMap((entry, index) => collectPaths(entry as LocaleValue, pathForChild(prefix, index)));
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    return entries.length === 0
      ? []
      : entries.flatMap(([key, entry]) => collectPaths(entry as LocaleValue, pathForChild(prefix, key)));
  }

  return [prefix];
}

function uniqueSorted(paths: string[]) {
  return [...new Set(paths)].filter(Boolean).sort();
}

export function findMissingLocalePaths(source: LocaleValue, target: LocaleValue): MissingLocalePaths {
  const sourcePaths = new Set(collectPaths(source));
  const targetPaths = new Set(collectPaths(target));

  return {
    missingFromSource: uniqueSorted([...targetPaths].filter(path => !sourcePaths.has(path))),
    missingFromTarget: uniqueSorted([...sourcePaths].filter(path => !targetPaths.has(path))),
  };
}

export function findReferencedLocaleKeys(sources: string[]) {
  const keys = sources.flatMap((source) => {
    const found: string[] = [];
    const translationCall = /(?<![\w$])\$?t\(\s*["'`]([^"'`]+)["'`]\s*[,)]/g;
    for (const match of source.matchAll(translationCall)) {
      if (match[1])
        found.push(match[1]);
    }
    return found;
  });

  return uniqueSorted(keys);
}

export function findMissingReferencedLocaleKeys(sources: string[], locale: LocaleValue) {
  const paths = new Set(collectPaths(locale));
  return findReferencedLocaleKeys(sources).filter(key => !paths.has(key));
}

const publicAttributes = /(?<!:)\b(?:aria-label|description|hint|label|placeholder|title)="([^"{]+)"/g;
const publicTypeScriptStrings = /(?:title|description):\s*"([^"]+)"|useHead\(\{\s*title:\s*"([^"]+)"|error\.value\s*=\s*"([^"]+)"/g;
const ignoredText = /^(?:https?:\/\/|[•·]|vs)$/i;

export function findHardCodedUiText(source: string) {
  const violations: string[] = [];

  for (const match of source.matchAll(publicAttributes)) {
    const value = match[1]?.trim();
    if (value && !value.startsWith("$t(") && !ignoredText.test(value))
      violations.push(value);
  }

  for (const match of source.matchAll(publicTypeScriptStrings)) {
    const value = match[1] || match[2] || match[3];
    if (value && !value.startsWith("$t(") && !ignoredText.test(value))
      violations.push(value);
  }

  for (const [index, line] of source.split("\n").entries()) {
    const text = line.match(/>([^<]*)<\//)?.[1]?.trim();
    if (text && !text.includes("{{") && !ignoredText.test(text) && /[a-z]/i.test(text))
      violations.push(`line ${index + 1}: ${text}`);
  }

  return violations;
}

export function findHardCodedUiTextInSources(sources: Array<{ path: string; source: string }>) {
  return sources.flatMap(({ path, source }) => findHardCodedUiText(source).map(text => `${path}: ${text}`));
}
