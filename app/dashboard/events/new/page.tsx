import { EventForm } from "@/components/dashboard/event-form"

export default function NewEventPage() {
  return (
    <div className="p-8">
      <EventForm mode="create" />
    </div>
  )
}
