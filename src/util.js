// Shared constants and helpers.
export const PLATFORMS = ['ChatGPT', 'Google AI Mode']

export const uniq = (items) => [...new Set(items)]
export const countBy = (items, key) => {
  const counts = new Map()
  for (const item of items) counts.set(key(item), (counts.get(key(item)) || 0) + 1)
  return counts
}
