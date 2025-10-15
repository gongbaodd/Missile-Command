export function generateRandomHash(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let hash = "";
  for (let i = 0; i < 6; i++) {
    hash += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return hash;
}
