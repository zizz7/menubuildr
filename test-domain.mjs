async function main() {
  try {
    console.log("Testing https://menubuildr.com ...");
    const res = await fetch("https://menubuildr.com", { redirect: "manual" });
    console.log("Status:", res.status);
    console.log("Headers:");
    for (const [k, v] of res.headers) {
      console.log(`  ${k}: ${v}`);
    }
  } catch (err) {
    console.log("Error:", err.message);
  }

  try {
    console.log("\nTesting https://app.menubuildr.com ...");
    const res2 = await fetch("https://app.menubuildr.com", { redirect: "manual" });
    console.log("Status:", res2.status);
  } catch (err) {
    console.log("Error:", err.message);
  }
}
main();
