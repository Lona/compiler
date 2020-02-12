let currentUUIDCount = 1

export const uuid = () => {
  let currentCount = currentUUIDCount
  currentUUIDCount = currentCount + 1
  return currentCount.toString()
}
