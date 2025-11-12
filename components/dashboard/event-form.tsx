"use client"

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import type { Path } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  FiLoader,
  FiPlus,
  FiTrash2,
  FiEye,
  FiSave,
  FiCalendar,
  FiClock,
  FiChevronRight,
  FiChevronLeft,
  FiCheckCircle,
} from "react-icons/fi"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import Image from "next/image"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createEventAction, updateEventAction, type EventFormInput } from "@/app/dashboard/events/actions"
import { uploadEventHeroAction } from "@/app/dashboard/events/upload-hero-action"
import { useToast } from "@/components/ui/use-toast"

type GooglePlacePrediction = {
  description: string
  place_id: string
  structured_formatting?: {
    main_text?: string
    secondary_text?: string
  }
}

type SelectedVenuePreview = {
  name: string
  address: string
  lat?: number | null
  lng?: number | null
}

const ticketFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Ticket name is required"),
  price: z.string().min(1, "Price is required"),
  currency: z.string().length(3, "Use a 3-letter currency code").default("NGN"),
  quantity: z.string().min(1, "Quantity is required"),
  salesStart: z.string().optional().nullable(),
  salesEnd: z.string().optional().nullable(),
  perCustomerLimit: z.string().optional().nullable(),
})

const recurrenceOptions = ["none", "weekly", "monthly", "semiannual", "annual"] as const

const eventFormSchema = z.object({
  productId: z.string().uuid().optional(),
  title: z.string().min(3, "Title is required"),
  description: z.string().optional().nullable(),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  venueName: z.string().optional().nullable(),
  venueAddress: z.string().optional().nullable(),
  venueCity: z.string().optional().nullable(),
  venueState: z.string().optional().nullable(),
  venueCountry: z.string().optional().nullable(),
  heroImage: z.string().optional().nullable(),
  recurrenceFrequency: z.enum(recurrenceOptions).optional().default("none"),
  tickets: z.array(ticketFormSchema).min(1, "Add at least one ticket"),
})

type EventFormValues = z.infer<typeof eventFormSchema>

const defaultTicket: EventFormValues["tickets"][number] = {
  name: "",
  price: "",
  currency: "NGN",
  quantity: "",
  salesStart: "",
  salesEnd: "",
  perCustomerLimit: "",
}

const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, index) => {
  const hour = Math.floor(index / 2)
  const minute = index % 2 === 0 ? 0 : 30
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  const label = format(new Date(`1970-01-01T${value}:00`), "h:mm a")
  return { value, label }
})

const fieldInputClass =
  "h-12 rounded-xl border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus-visible:border-[var(--brand-primary)]/40 focus-visible:ring-[var(--brand-primary)]/20"
const textAreaClass =
  "min-h-[140px] rounded-2xl border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus-visible:border-[var(--brand-primary)]/40 focus-visible:ring-[var(--brand-primary)]/20"
const selectTriggerClass =
  "h-12 rounded-xl border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus-visible:border-[var(--brand-primary)]/40 focus-visible:ring-[var(--brand-primary)]/20"
const sectionCardClass =
  "rounded-[32px] border-0 bg-white/90 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-100"

function isNextRedirectError(error: unknown): error is { digest: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (error as { digest: string }).digest === "NEXT_REDIRECT")
  )
}

type TicketDateTimePickerProps = {
  label: string
  value?: string | null
  onChange: (value: string) => void
}

function TicketDateTimePicker({ label, value, onChange }: TicketDateTimePickerProps) {
  const datePart = value?.split("T")[0] ?? ""
  const timeRaw = value?.includes("T") ? value.split("T")[1] ?? "" : ""
  const timePart = timeRaw.slice(0, 5)
  const selectedDate = datePart ? parseISO(`${datePart}T00:00:00`) : undefined

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange("")
      return
    }
    const dateString = format(date, "yyyy-MM-dd")
    const nextValue = timePart && timePart.length >= 4 ? `${dateString}T${timePart}` : dateString
    onChange(nextValue)
  }

  const handleTimeChange = (value: string) => {
    if (!datePart) {
      onChange("")
      return
    }
    if (value === "none") {
      onChange(datePart)
    } else {
      onChange(`${datePart}T${value}`)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)]">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(fieldInputClass, "justify-start text-left font-normal gap-2", !datePart && "text-slate-400")}
            >
              <FiCalendar className="h-4 w-4 text-slate-400" />
              {selectedDate ? format(selectedDate, "EEE, MMM d yyyy") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select value={timePart && timePart.length >= 4 ? timePart : "none"} onValueChange={handleTimeChange}>
          <SelectTrigger className={cn(selectTriggerClass, "justify-start text-left gap-2")}>
            <div className="flex items-center gap-2 truncate text-slate-600">
              <FiClock className="h-4 w-4 text-slate-400" />
              <SelectValue placeholder="Select time" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No time</SelectItem>
            {TIME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

type EventFormProps = {
  initialData?: Partial<EventFormValues>
  mode: "create" | "update"
}

export function EventForm({ initialData, mode }: EventFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isHeroUploading, startHeroUpload] = useTransition()
  const heroFileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()
  const HERO_UPLOAD_MAX_BYTES = 5 * 1024 * 1024
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY ?? ""
  const storageKey = useMemo(() => {
    const baseId = mode === "update" ? initialData?.productId ?? "existing" : "new"
    return `event-form:${baseId}`
  }, [initialData?.productId, mode])
  const shouldPersistRef = useRef(false)
  const [currentStep, setCurrentStep] = useState(0)

  const [venueQuery, setVenueQuery] = useState(() => {
    if (initialData?.venueName) return initialData.venueName
    if (initialData?.venueAddress) return initialData.venueAddress
    return ""
  })
  const [venuePredictions, setVenuePredictions] = useState<GooglePlacePrediction[]>([])
  const [showVenuePredictions, setShowVenuePredictions] = useState(false)
  const [isVenueLoading, setIsVenueLoading] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedVenuePreview, setSelectedVenuePreview] = useState<SelectedVenuePreview | null>(() => {
    if (initialData?.venueName || initialData?.venueAddress) {
      return {
        name: initialData?.venueName ?? "",
        address: initialData?.venueAddress ?? "",
        lat: undefined,
        lng: undefined,
      }
    }
    return null
  })

  const normalizedTickets: EventFormValues["tickets"] =
    initialData?.tickets && initialData.tickets.length > 0
      ? initialData.tickets.map((ticket) => ({
          ...defaultTicket,
          ...ticket,
          price: ticket.price ?? "",
          quantity: ticket.quantity ?? "",
          perCustomerLimit: ticket.perCustomerLimit ?? "",
        }))
      : [defaultTicket]

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      venueName: "",
      venueAddress: "",
      venueCity: "",
      venueState: "",
      venueCountry: "",
      heroImage: "",
      recurrenceFrequency: "none",
      ...initialData,
      tickets: normalizedTickets,
    },
  })

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
  } = form

  const heroImageValue = watch("heroImage")

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    if (mode === "create") {
      const stored = window.localStorage.getItem(storageKey)
      if (!stored) {
        shouldPersistRef.current = true
        return
      }
      try {
        const parsed = JSON.parse(stored) as Partial<EventFormValues>
        if (parsed && Object.keys(parsed).length > 0) {
          shouldPersistRef.current = false
          const currentValues = form.getValues()
          form.reset({
            ...currentValues,
            ...parsed,
            tickets:
              parsed.tickets && parsed.tickets.length > 0
                ? parsed.tickets.map((ticket) => ({
                    ...defaultTicket,
                    ...ticket,
                  }))
                : currentValues.tickets,
          })
        }
      } catch (error) {
        console.error("Failed to hydrate event form from localStorage", error)
        window.localStorage.removeItem(storageKey)
      } finally {
        shouldPersistRef.current = true
      }
    } else {
      shouldPersistRef.current = false
    }
  }, [form, storageKey, mode])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    if (mode === "update") {
      return
    }
    const subscription = form.watch((value) => {
      if (!shouldPersistRef.current) {
        return
      }
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(value))
      } catch (error) {
        console.error("Failed to persist event form state to localStorage", error)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, storageKey, mode])

  const clearPersistedState = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }
    try {
      window.localStorage.removeItem(storageKey)
    } catch (error) {
      console.error("Failed to clear persisted event form state", error)
    }
    shouldPersistRef.current = mode === "create" ? false : true
  }, [mode, storageKey])

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleHeroUploadClick = () => {
    heroFileInputRef.current?.click()
  }

  const handleHeroFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.target
    const file = fileInput.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Unsupported file type",
        description: "Please choose a PNG or JPEG image.",
        variant: "destructive",
      })
      fileInput.value = ""
      return
    }

    if (file.size > HERO_UPLOAD_MAX_BYTES) {
      toast({
        title: "Image too large",
        description: "Upload an image smaller than 5MB.",
        variant: "destructive",
      })
      fileInput.value = ""
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    startHeroUpload(async () => {
      try {
        const result = await uploadEventHeroAction(formData)
        if (!result?.success || !result.url) {
          toast({
            title: "Hero image not uploaded",
            description: result?.error ?? "Please try again in a moment.",
            variant: "destructive",
          })
          return
        }

        form.setValue("heroImage", result.url, { shouldDirty: true })
        toast({
          title: "Hero image updated",
          description: "We’ll use this image on your checkout and event page.",
        })
      } catch (error) {
        console.error("uploadEventHeroAction failed", error)
        toast({
          title: "Hero image not uploaded",
          description: "Something went wrong while uploading. Please try again.",
          variant: "destructive",
        })
      } finally {
        fileInput.value = ""
      }
    })
  }

  const handleHeroRemove = () => {
    form.setValue("heroImage", "", { shouldDirty: true })
    toast({
      title: "Hero image removed",
      description: "The hero slot is now empty.",
    })
  }

  const fetchVenuePredictions = async (query: string) => {
    try {
      const response = await fetch(`/api/google/places?input=${encodeURIComponent(query)}`, {
        method: "GET",
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error(`Failed to search Google Places: ${response.status}`)
      }
      const data = (await response.json()) as { predictions?: GooglePlacePrediction[] }
      setVenuePredictions((data.predictions ?? []).slice(0, 6))
    } catch (error) {
      console.error("fetchVenuePredictions error", error)
      toast({
        title: "Unable to search Google Maps",
        description: "Double-check your network connection and try again.",
        variant: "destructive",
      })
      setVenuePredictions([])
    } finally {
      setIsVenueLoading(false)
    }
  }

  const handleVenueSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setVenueQuery(value)
    setShowVenuePredictions(true)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!value || value.trim().length < 3) {
      setIsVenueLoading(false)
      setVenuePredictions([])
      return
    }

    setIsVenueLoading(true)
    searchTimeoutRef.current = setTimeout(() => {
      void fetchVenuePredictions(value.trim())
    }, 300)
  }

  const handlePredictionSelect = async (prediction: GooglePlacePrediction) => {
    setVenueQuery(prediction.description)
    setShowVenuePredictions(false)
    setVenuePredictions([])
    setIsVenueLoading(true)

    try {
      const response = await fetch(`/api/google/places?placeId=${encodeURIComponent(prediction.place_id)}`, {
        method: "GET",
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error(`Failed to retrieve place details: ${response.status}`)
      }
      const data = (await response.json()) as {
        result?: {
          name?: string
          formatted_address?: string
          address_components?: Array<{ long_name: string; types: string[] }>
          geometry?: { location?: { lat?: number; lng?: number } }
        }
      }
      const place = data.result
      if (!place) {
        throw new Error("No place details returned from Google")
      }

      const components = place.address_components ?? []
      const getComponent = (...types: string[]) =>
        components.find((component) => types.some((type) => component.types.includes(type)))?.long_name ?? ""

      const city = getComponent("locality") || getComponent("administrative_area_level_2")
      const state = getComponent("administrative_area_level_1")
      const country = getComponent("country")

      form.setValue("venueName", place.name ?? prediction.structured_formatting?.main_text ?? "", { shouldDirty: true })
      form.setValue("venueAddress", place.formatted_address ?? prediction.description ?? "", { shouldDirty: true })
      form.setValue("venueCity", city, { shouldDirty: true })
      form.setValue("venueState", state, { shouldDirty: true })
      form.setValue("venueCountry", country, { shouldDirty: true })

      setSelectedVenuePreview({
        name: place.name ?? prediction.structured_formatting?.main_text ?? "",
        address: place.formatted_address ?? prediction.description ?? "",
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
      })
    } catch (error) {
      console.error("handlePredictionSelect error", error)
      toast({
        title: "Unable to fetch place details",
        description: "Please choose a different suggestion or fill the address manually.",
        variant: "destructive",
      })
    } finally {
      setIsVenueLoading(false)
    }
  }

  const { fields, append, remove } = useFieldArray({
    control,
    name: "tickets",
  })

  const steps = [
    {
      title: "Event Basics",
      description: "Craft the story and visuals for your experience.",
    },
    {
      title: "Schedule & Venue",
      description: "Plan when it happens and where guests should arrive.",
    },
    {
      title: "Tickets & Pricing",
      description: "Set up inventory, pricing, and availability windows.",
    },
  ] as const

  const totalSteps = steps.length
  const isLastStep = currentStep === totalSteps - 1

  const stepFieldMap: Path<EventFormValues>[][] = [
    ["title", "description", "recurrenceFrequency", "heroImage"],
    ["startDate", "startTime", "endDate", "endTime", "venueName", "venueAddress", "venueCity", "venueState", "venueCountry"],
    ["tickets"],
  ]

  const handleStepSelect = async (index: number) => {
    if (index === currentStep || isPending) {
      return
    }

    if (index < currentStep) {
      setCurrentStep(index)
      return
    }

    let nextStep = currentStep
    while (nextStep < index) {
      const fields = stepFieldMap[nextStep] ?? []
      const isValid = await trigger(fields as Path<EventFormValues>[], { shouldFocus: true })
      if (!isValid) {
        return
      }
      nextStep += 1
    }

    setCurrentStep(index)
  }

  const handleNextStep = async () => {
    if (isLastStep) {
      return
    }
    const fields = stepFieldMap[currentStep] ?? []
    const isValid = await trigger(fields as Path<EventFormValues>[], { shouldFocus: true })
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))
    }
  }

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const onSubmit = (values: EventFormValues) => {
    const payload: EventFormInput = {
      ...values,
      startTime: values.startTime || undefined,
      endTime: values.endTime || undefined,
      recurrenceFrequency:
        values.recurrenceFrequency && values.recurrenceFrequency !== "none"
          ? values.recurrenceFrequency
          : undefined,
      tickets: values.tickets.map((ticket) => ({
        id: ticket.id,
        name: ticket.name,
        currency: ticket.currency,
        price: Number(ticket.price),
        quantity: Number(ticket.quantity),
        salesStart: ticket.salesStart || undefined,
        salesEnd: ticket.salesEnd || undefined,
        perCustomerLimit: ticket.perCustomerLimit || undefined,
      })),
    }

    startTransition(() => {
      void (async () => {
        try {
          if (mode === "update") {
            await updateEventAction(payload)
            clearPersistedState()
          } else {
            await createEventAction(payload)
            clearPersistedState()
          }
        } catch (error) {
          if (isNextRedirectError(error)) {
            clearPersistedState()
          } else {
            shouldPersistRef.current = true
          }
          throw error
        }
      })()
    })
  }

  const watchTickets = watch("tickets")
  const watchStartDate = watch("startDate")
  const watchStartTime = watch("startTime")
  const watchEndDate = watch("endDate")
  const watchEndTime = watch("endTime")

  const handleFormSubmit = handleSubmit(onSubmit)

  const buildTicketDateTime = (date: string | null | undefined, time: string | null | undefined) => {
    if (!date || date.trim().length === 0) {
      return ""
    }
    if (!time || time.trim().length === 0) {
      return `${date}T00:00:00Z`
    }
    return `${date}T${time}:00Z`
  }

  useEffect(() => {
    if (mode !== "create") {
      return
    }
    const newStart = buildTicketDateTime(watchStartDate, watchStartTime)
    const currentTickets = form.getValues("tickets")
    currentTickets.forEach((ticket, index) => {
      const existingValue = ticket.salesStart ?? ""
      if (existingValue !== newStart) {
        form.setValue(`tickets.${index}.salesStart`, newStart, { shouldDirty: true })
      }
    })
  }, [watchStartDate, watchStartTime, form, fields.length, mode])

  useEffect(() => {
    if (mode !== "create") {
      return
    }
    const newEnd = buildTicketDateTime(watchEndDate, watchEndTime)
    const currentTickets = form.getValues("tickets")
    currentTickets.forEach((ticket, index) => {
      const existingValue = ticket.salesEnd ?? ""
      if (existingValue !== newEnd) {
        form.setValue(`tickets.${index}.salesEnd`, newEnd, { shouldDirty: true })
      }
    })
  }, [watchEndDate, watchEndTime, form, fields.length, mode])

  const totalInventory = useMemo(() => {
    return watchTickets.reduce((sum, ticket) => sum + (Number(ticket.quantity) || 0), 0)
  }, [watchTickets])

  const totalValue = useMemo(() => {
    return watchTickets.reduce((sum, ticket) => {
      const price = Number(ticket.price) || 0
      const quantity = Number(ticket.quantity) || 0
      return sum + price * quantity
    }, 0)
  }, [watchTickets])

  const scheduleMomentSections = [
    {
      key: "start",
      title: "Event start",
      description: "When doors open and the program begins.",
      dateName: "startDate" as const,
      timeName: "startTime" as const,
      dateError: errors.startDate?.message,
    },
    {
      key: "end",
      title: "Event wrap-up",
      description: "Help guests plan their exit or after-party.",
      dateName: "endDate" as const,
      timeName: "endTime" as const,
      dateError: errors.endDate?.message,
    },
  ]

  return (
    <form
      className="space-y-10"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <div className="rounded-3xl bg-gradient-to-br from-[var(--brand-primary)]/12 via-white to-white/95 px-6 py-7 shadow-[0_32px_60px_-40px_rgba(15,23,42,0.55)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              {mode === "create" ? "New Experience" : "Update Event"}
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              {mode === "create" ? "Create a new event" : "Manage your event details"}
            </h1>
            <p className="text-sm text-slate-500">
              Follow the guided flow to launch a polished listing in minutes.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {mode === "update" && initialData?.productId && (
              <Link href={`/dashboard/events/${initialData.productId}`}>
                <Button
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white px-5 text-sm text-slate-600 shadow-sm hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"
                >
                  <FiEye className="mr-2 h-4 w-4" />
                  View event
                </Button>
              </Link>
            )}
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
              <FiCalendar className="h-4 w-4 text-[var(--brand-primary)]/70" />
              {totalInventory} seats configured
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border-0 bg-white/90 px-6 py-6 shadow-[0_32px_60px_-42px_rgba(15,23,42,0.45)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Creation flow</p>
            <h2 className="text-xl font-semibold text-slate-900">3 steps to launch your event</h2>
          </div>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => void handleStepSelect(index)}
                disabled={isPending}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40",
                  isActive
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                    : isCompleted
                      ? "border-transparent bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                      : "border-transparent bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition",
                    isCompleted
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                      : isActive
                        ? "border-[var(--brand-primary)] bg-white text-[var(--brand-primary)]"
                        : "border-slate-200 bg-slate-100 text-slate-500",
                  )}
                >
                  {isCompleted ? <FiCheckCircle className="h-4 w-4" /> : index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-slate-500">{step.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {currentStep === 0 && (
      <Card className={sectionCardClass}>
        <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-900">Event basics</CardTitle>
          <CardDescription className="text-slate-500">
              Shape the narrative of your experience and set a compelling first impression.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Title</label>
                <Input
                  placeholder="Summer Music Festival"
                  className={fieldInputClass}
                  {...form.register("title")}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Description</label>
                <Textarea
                  placeholder="Describe your event..."
                  className={textAreaClass}
                  {...form.register("description")}
                />
              </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Recurring schedule</label>
                  <Controller
                    control={control}
                    name="recurrenceFrequency"
                    render={({ field }) => (
                      <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                        <SelectTrigger className={cn(selectTriggerClass, "justify-start text-left")}>
                          <SelectValue placeholder="Does this event repeat?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Does not repeat</SelectItem>
                          <SelectItem value="weekly">Every week</SelectItem>
                          <SelectItem value="monthly">Every month</SelectItem>
                          <SelectItem value="semiannual">Every 6 months</SelectItem>
                          <SelectItem value="annual">Every year</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-slate-500">
                    Prefill future schedules and automate marketing with the right cadence.
                  </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-slate-200 bg-slate-50/60">
                {heroImageValue ? (
                  <Image
                    src={heroImageValue}
                    alt="Event hero"
                    fill
                    sizes="320px"
                    className="object-cover"
                  />
                ) : (
                  <span className="px-8 text-center text-sm text-slate-400">
                    Upload a standout image to highlight your event.
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white px-5 text-sm text-slate-600 shadow-sm hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"
                  onClick={handleHeroUploadClick}
                  disabled={isHeroUploading}
                >
                  {isHeroUploading ? "Uploading..." : heroImageValue ? "Replace image" : "Upload image"}
                </Button>
                {heroImageValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full px-5 text-sm text-slate-500 hover:text-[var(--brand-primary)]"
                    onClick={handleHeroRemove}
                    disabled={isHeroUploading}
                  >
                    Remove image
                  </Button>
                )}
                <p className="text-xs text-slate-500">JPEG or PNG, max 5MB. 16:9 or square for best impact.</p>
              </div>
              <input
                ref={heroFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleHeroFileChange}
              />
              <input type="hidden" {...form.register("heroImage")} />
            </div>
          </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card className={sectionCardClass}>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-900">Schedule & venue</CardTitle>
            <CardDescription className="text-slate-500">
              Lock in dates, times, and the location so attendees know exactly where to go.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              {scheduleMomentSections.map((section) => (
                <div
                  key={section.key}
                  className="rounded-[28px] border border-slate-200 bg-white/85 shadow-sm ring-1 ring-transparent transition hover:ring-[var(--brand-primary)]/20"
                >
                  <div className="border-b border-slate-200 px-5 py-4">
                    <p className="text-sm font-semibold text-slate-800">{section.title}</p>
                    <p className="text-xs text-slate-500">{section.description}</p>
              </div>
                  <div className="grid gap-6 p-5 sm:grid-cols-2">
                    <div className="space-y-2 flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date</span>
                <Controller
                  control={control}
                        name={section.dateName}
                  render={({ field }) => {
                    const selectedDate = field.value ? parseISO(field.value) : undefined
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              fieldInputClass,
                              "justify-start text-left font-normal gap-2",
                              !field.value && "text-slate-400",
                            )}
                          >
                            <FiCalendar className="h-4 w-4 text-slate-400" />
                            {selectedDate ? format(selectedDate, "EEEE, MMM d, yyyy") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )
                  }}
                />
                      {section.dateError && <p className="text-xs text-destructive">{section.dateError}</p>}
              </div>
              <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Time</span>
                <Controller
                  control={control}
                        name={section.timeName}
                  render={({ field }) => (
                    <Select
                      value={field.value && field.value.length > 0 ? field.value : "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                    >
                      <SelectTrigger className={cn(selectTriggerClass, "justify-start text-left gap-2")}>
                        <div className="flex items-center gap-2 truncate text-slate-600">
                          <FiClock className="h-4 w-4 text-slate-400" />
                          <SelectValue placeholder="Select time" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No time</SelectItem>
                        {TIME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                      <p className="text-xs text-slate-500">
                        Leave as “No time” if the schedule is flexible.
                      </p>
              </div>
            </div>
                </div>
              ))}
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Find venue</label>
              <div className="relative">
                <Input
                  value={venueQuery}
                  onChange={handleVenueSearchChange}
                  onFocus={() => {
                    setShowVenuePredictions(true)
                    if (venuePredictions.length === 0 && !isVenueLoading && venueQuery.trim().length >= 3) {
                      setIsVenueLoading(true)
                      void fetchVenuePredictions(venueQuery.trim())
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowVenuePredictions(false), 150)
                  }}
                  placeholder="Search for a venue or address"
                  autoComplete="off"
                  className={fieldInputClass}
                />
                {showVenuePredictions && (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {isVenueLoading ? (
                      <div className="px-4 py-3 text-sm text-slate-500">Searching Google Maps…</div>
                    ) : venuePredictions.length > 0 ? (
                      <ul className="divide-y divide-slate-100">
                        {venuePredictions.map((prediction) => (
                          <li key={prediction.place_id}>
                            <button
                              type="button"
                              className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-[var(--brand-primary)]/5"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handlePredictionSelect(prediction)}
                            >
                              <span className="text-sm font-medium text-slate-700">
                                {prediction.structured_formatting?.main_text ?? prediction.description}
                              </span>
                              <span className="text-xs text-slate-500">
                                {prediction.structured_formatting?.secondary_text ?? prediction.description}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : venueQuery.trim().length >= 3 ? (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        No matches yet. Keep typing to refine your search.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Selecting a result will auto-fill the venue details below. You can fine-tune them afterwards.
              </p>
            </div>

            {selectedVenuePreview && (selectedVenuePreview.name || selectedVenuePreview.address) && (
              <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white/80 p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">
                    {selectedVenuePreview.name || "Selected venue"}
                  </p>
                  {selectedVenuePreview.address && (
                    <p className="text-xs text-slate-500">{selectedVenuePreview.address}</p>
                  )}
                </div>
                {selectedVenuePreview.lat != null &&
                  selectedVenuePreview.lng != null &&
                  googleMapsApiKey && (
                    <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-slate-200 sm:w-48">
                      <Image
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${selectedVenuePreview.lat},${selectedVenuePreview.lng}&zoom=16&size=400x200&scale=2&maptype=roadmap&markers=color:red%7C${selectedVenuePreview.lat},${selectedVenuePreview.lng}&key=${googleMapsApiKey}`}
                        alt="Selected venue map preview"
                        fill
                        sizes="192px"
                        className="object-cover"
                        priority={false}
                      />
                    </div>
                  )}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Venue name</label>
                <Input
                  placeholder="Lagos Beachfront Arena"
                  className={fieldInputClass}
                  {...form.register("venueName")}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Venue address</label>
                <Input
                  placeholder="123 Coastal Road, Victoria Island, Lagos"
                  className={fieldInputClass}
                  {...form.register("venueAddress")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">City</label>
                <Input placeholder="Lagos" className={fieldInputClass} {...form.register("venueCity")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">State / region</label>
                <Input placeholder="Lagos" className={fieldInputClass} {...form.register("venueState")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Country</label>
                <Input placeholder="Nigeria" className={fieldInputClass} {...form.register("venueCountry")} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {currentStep === 2 && (
      <Card className={sectionCardClass}>
        <CardHeader className="flex flex-col gap-2 pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl text-slate-900">Ticket types</CardTitle>
              <CardDescription className="text-slate-500">
                Create tiers that make sense for your audience—control price, inventory, and availability.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-full border-slate-200 bg-white px-5 text-sm text-slate-600 shadow-sm hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"
              onClick={() => append({ ...defaultTicket, id: undefined })}
              disabled={isPending}
            >
              <FiPlus className="h-4 w-4" />
              Add ticket type
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              Inventory
              <span className="rounded-full bg-white px-2 py-0.5 text-[var(--brand-primary)]">
                {totalInventory}
              </span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              Potential gross
              <span className="rounded-full bg-white px-2 py-0.5 text-[var(--brand-primary)]">
                {totalValue.toLocaleString(undefined, { style: "currency", currency: "NGN" })}
              </span>
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((field, index) => {
            const ticketErrors = errors.tickets?.[index]
            return (
              <div
                key={field.id}
                className="rounded-[28px] border border-slate-200 bg-white/85 shadow-sm ring-1 ring-transparent transition hover:ring-[var(--brand-primary)]/20"
              >
                <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700">Ticket Type {index + 1}</span>
                    <span className="text-xs text-slate-500">Configure price, inventory, and sales window.</span>
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="rounded-full hover:text-destructive"
                      onClick={() => remove(index)}
                      disabled={isPending}
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-6 p-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Ticket name</label>
                    <Input
                      placeholder="VIP Access"
                      className={fieldInputClass}
                      {...form.register(`tickets.${index}.name`)}
                    />
                    {ticketErrors?.name && <p className="text-xs text-destructive">{ticketErrors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Currency</label>
                    <Input
                      placeholder="NGN"
                      className={fieldInputClass}
                      {...form.register(`tickets.${index}.currency`)}
                    />
                    {ticketErrors?.currency && (
                      <p className="text-xs text-destructive">{ticketErrors.currency.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="25000"
                      className={fieldInputClass}
                      {...form.register(`tickets.${index}.price`)}
                    />
                    {ticketErrors?.price && <p className="text-xs text-destructive">{ticketErrors.price.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Quantity available</label>
                    <Input
                      type="number"
                      placeholder="500"
                      className={fieldInputClass}
                      {...form.register(`tickets.${index}.quantity`)}
                    />
                    {ticketErrors?.quantity && (
                      <p className="text-xs text-destructive">{ticketErrors.quantity.message}</p>
                    )}
                  </div>
                  <Controller
                    control={control}
                    name={`tickets.${index}.salesStart`}
                    render={({ field }) => (
                      <TicketDateTimePicker label="Sales start" value={field.value ?? ""} onChange={field.onChange} />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`tickets.${index}.salesEnd`}
                    render={({ field }) => (
                      <TicketDateTimePicker label="Sales end" value={field.value ?? ""} onChange={field.onChange} />
                    )}
                  />
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-600">Per customer limit</label>
                    <Input
                      type="number"
                      placeholder="e.g. 4"
                      className={fieldInputClass}
                      {...form.register(`tickets.${index}.perCustomerLimit`)}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
      )}

      <div className="flex flex-col gap-4 pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-medium text-slate-500">
          {isLastStep ? "Review your details and launch when ready." : "You can revisit earlier steps anytime."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {currentStep > 0 && (
        <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-full border-slate-200 bg-white px-5 text-sm text-slate-600 shadow-sm hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"
              onClick={handlePreviousStep}
          disabled={isPending}
            >
              <FiChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          {isLastStep ? (
            <Button
              type="button"
              onClick={() => handleFormSubmit()}
              disabled={isPending}
              className="gap-2 rounded-full bg-[var(--brand-primary)] px-6 text-sm font-semibold text-white shadow-md hover:bg-[var(--brand-primary)]/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isPending ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiSave className="h-4 w-4" />}
          {mode === "create" ? "Launch event" : "Save changes"}
        </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void handleNextStep()}
              disabled={isPending}
              className="gap-2 rounded-full bg-[var(--brand-primary)] px-6 text-sm font-semibold text-white shadow-md hover:bg-[var(--brand-primary)]/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              Next step
              <FiChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}

