type Job = () => Promise<void>

const jobQueue: Job[] = []
let processing = false

async function runNext() {
  if (processing) return
  const job = jobQueue.shift()
  if (!job) return

  processing = true
  try {
    await job()
  } catch (error) {
    console.error("Background job failed", error)
  } finally {
    processing = false
    setImmediate(runNext)
  }
}

export function enqueueJob(job: Job) {
  jobQueue.push(job)
  setImmediate(runNext)
}

