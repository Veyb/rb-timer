// auto generate id to be the same for input & label
export function generateId(id?: string) {
  const randomId = Math.floor(Math.random() * 10000);
  return id || `input-${randomId}`;
}
