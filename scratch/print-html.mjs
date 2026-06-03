async function print() {
  const url = 'https://pronoia-3g6y.vercel.app/life-os';
  try {
    const res = await fetch(url);
    const html = await res.text();
    console.log("HTML response (first 3000 chars):");
    console.log(html.substring(0, 3000));
  } catch (err) {
    console.error(err);
  }
}
print();
