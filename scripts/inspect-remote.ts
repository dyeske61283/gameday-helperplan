const databases = [
  "64cf36e4-13b2-4c12-aab0-ffb5f258e270",
  "7f9405f4-0afe-441c-91f2-a8f2b3c27d9a",
  "39dd3099-e90d-4ce6-be9f-f5088084e8b1",
  "27e8db4b-ad08-4b52-baf0-0a90717e44e9",
  "83a90654-6e9f-4e1f-b62f-7fce8c1a0668",
  "e4533f73-2266-4de9-82c2-85d95385cbba",
  "1ea34545-0b9a-4b5d-a884-6450064dfa7a",
];

for await (const d of databases) {
  const kv = await Deno.openKv(`https://api.deno.com/v2/databases/${d}/connect`);

  // Iterate over all entries in the store
  const entries = kv.list({ prefix: [] });
  for await (const entry of entries) {
    console.log("Key:", entry.key);
    console.log("Value:", entry.value);
    console.log("Versionstamp:", entry.versionstamp);
    console.log("----------------------------");
  }
  kv.close();
}
