const memoryStore = new Map()

const AsyncStorage = {
  async getItem(key) {
    return memoryStore.has(key) ? memoryStore.get(key) : null
  },
  async setItem(key, value) {
    memoryStore.set(key, value)
  },
  async removeItem(key) {
    memoryStore.delete(key)
  },
  async clear() {
    memoryStore.clear()
  },
  async getAllKeys() {
    return [...memoryStore.keys()]
  },
  async multiGet(keys) {
    return keys.map((key) => [key, memoryStore.has(key) ? memoryStore.get(key) : null])
  },
  async multiSet(entries) {
    for (const [key, value] of entries) {
      memoryStore.set(key, value)
    }
  },
  async multiRemove(keys) {
    for (const key of keys) {
      memoryStore.delete(key)
    }
  },
}

module.exports = AsyncStorage
module.exports.default = AsyncStorage
