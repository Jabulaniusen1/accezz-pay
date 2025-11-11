"use client"

import { type ChangeEvent, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { FiLoader, FiPlus, FiTrash2, FiEye, FiSave, FiCalendar, FiClock } from "react-icons/fi"
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
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)]">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !datePart && "text-muted-foreground",
              )}
            >
              <FiCalendar className="mr-2 h-4 w-4 text-muted-foreground" />
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
          <SelectTrigger className="w-full justify-start text-left">
            <div className="flex items-center gap-2 truncate">
              <FiClock className="h-4 w-4 text-muted-foreground" />
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
  } = form

  const heroImageValue = watch("heroImage")

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
      if (mode === "update") {
        return updateEventAction(payload)
      }
      return createEventAction(payload)
    })
  }

  const watchTickets = watch("tickets")

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

  return (
    <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{mode === "create" ? "Create New Event" : "Edit Event"}</h1>
          <p className="text-foreground/70 mt-1">Configure the details of your product and ticketed experiences.</p>
        </div>
        {mode === "update" && initialData?.productId && (
          <Link href={`/dashboard/events/${initialData.productId}`}>
            <Button variant="outline" className="gap-2">
              <FiEye className="h-4 w-4" />
              View Event
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>Basic information used across your checkout and marketing surfaces.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input placeholder="Summer Music Festival" {...form.register("title")} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Hero Image</label>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted sm:w-72">
                  {heroImageValue ? (
                    <Image
                      src={heroImageValue}
                      alt="Event hero"
                      fill
                      sizes="288px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-sm text-foreground/60 text-center px-6">
                      Upload a standout image to highlight your event.
                    </span>
                  )}
                </div>
                <div className="flex w-full max-w-xs flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleHeroUploadClick}
                    disabled={isHeroUploading}
                  >
                    {isHeroUploading ? "Uploading..." : heroImageValue ? "Replace image" : "Upload image"}
                  </Button>
                  {heroImageValue && (
                    <Button type="button" variant="ghost" onClick={handleHeroRemove} disabled={isHeroUploading}>
                      Remove image
                    </Button>
                  )}
                  <p className="text-xs text-foreground/60">
                    JPEG or PNG, max 5MB. Aim for a 16:9 or square aspect ratio for best results.
                  </p>
                </div>
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

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Recurring Schedule</label>
              <Controller
                control={control}
                name="recurrenceFrequency"
                render={({ field }) => (
                  <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full justify-start text-left">
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
              <p className="text-xs text-foreground/60">
                We’ll use this to prefill future occurrences and power automations.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea placeholder="Describe your event..." {...form.register("description")} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Start Date</label>
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => {
                    const selectedDate = field.value ? parseISO(field.value) : undefined
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <FiCalendar className="mr-2 h-4 w-4 text-muted-foreground" />
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
                {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Start Time</label>
                <Controller
                  control={control}
                  name="startTime"
                  render={({ field }) => (
                    <Select
                      value={field.value && field.value.length > 0 ? field.value : "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                    >
                      <SelectTrigger className="w-full justify-start text-left">
                        <div className="flex items-center gap-2 truncate">
                          <FiClock className="h-4 w-4 text-muted-foreground" />
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
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">End Date</label>
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field }) => {
                    const selectedDate = field.value ? parseISO(field.value) : undefined
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <FiCalendar className="mr-2 h-4 w-4 text-muted-foreground" />
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
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">End Time</label>
                <Controller
                  control={control}
                  name="endTime"
                  render={({ field }) => (
                    <Select
                      value={field.value && field.value.length > 0 ? field.value : "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                    >
                      <SelectTrigger className="w-full justify-start text-left">
                        <div className="flex items-center gap-2 truncate">
                          <FiClock className="h-4 w-4 text-muted-foreground" />
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
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Find Venue</label>
              <div className="relative">
                <Input
                  value={venueQuery}
                  onChange={handleVenueSearchChange}
                  onFocus={() => {
                    setShowVenuePredictions(true)
                    if (
                      venuePredictions.length === 0 &&
                      !isVenueLoading &&
                      venueQuery.trim().length >= 3
                    ) {
                      setIsVenueLoading(true)
                      void fetchVenuePredictions(venueQuery.trim())
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowVenuePredictions(false), 150)
                  }}
                  placeholder="Search for a venue or address"
                  autoComplete="off"
                />
                {showVenuePredictions && (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                    {isVenueLoading ? (
                      <div className="px-3 py-2 text-sm text-foreground/60">Searching Google Maps…</div>
                    ) : venuePredictions.length > 0 ? (
                      <ul className="divide-y divide-border/70">
                        {venuePredictions.map((prediction) => (
                          <li key={prediction.place_id}>
                            <button
                              type="button"
                              className="flex w-full flex-col gap-1 px-3 py-2 text-left hover:bg-accent"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handlePredictionSelect(prediction)}
                            >
                              <span className="text-sm font-medium text-foreground">
                                {prediction.structured_formatting?.main_text ?? prediction.description}
                              </span>
                              <span className="text-xs text-foreground/60">
                                {prediction.structured_formatting?.secondary_text ?? prediction.description}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : venueQuery.trim().length >= 3 ? (
                      <div className="px-3 py-2 text-sm text-foreground/60">
                        No matches yet. Keep typing to refine your search.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <p className="text-xs text-foreground/60">
                Search powered by Google Maps. Selecting a result will auto-fill the venue details below.
              </p>
            </div>

            {selectedVenuePreview && (selectedVenuePreview.name || selectedVenuePreview.address) && (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {selectedVenuePreview.name || "Selected venue"}
                  </p>
                  {selectedVenuePreview.address && (
                    <p className="text-xs text-foreground/70">{selectedVenuePreview.address}</p>
                  )}
                </div>
                {selectedVenuePreview.lat != null &&
                  selectedVenuePreview.lng != null &&
                  googleMapsApiKey && (
                    <div className="relative h-32 w-full overflow-hidden rounded-lg border border-border sm:w-48">
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
              <label className="text-sm font-medium text-foreground">Venue Name</label>
              <Input placeholder="Lagos Beachfront Arena" {...form.register("venueName")} />
            </div>
              <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Venue Address</label>
                <Input placeholder="123 Coastal Road, Victoria Island, Lagos" {...form.register("venueAddress")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">City</label>
              <Input placeholder="Lagos" {...form.register("venueCity")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">State / Region</label>
              <Input placeholder="Lagos" {...form.register("venueState")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Country</label>
              <Input placeholder="Nigeria" {...form.register("venueCountry")} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Ticket Types</CardTitle>
              <CardDescription>Create the ticket tiers that will be available for purchase.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => append({ ...defaultTicket, id: undefined })}
              disabled={isPending}
            >
              <FiPlus className="h-4 w-4" />
              Add Ticket Type
            </Button>
          </div>
          <div className="flex gap-6 text-sm text-foreground/70">
            <div>Total Inventory: <span className="font-semibold text-foreground">{totalInventory}</span></div>
            <div>Potential Gross: <span className="font-semibold text-foreground">{totalValue.toLocaleString(undefined, { style: "currency", currency: "NGN" })}</span></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((field, index) => {
            const ticketErrors = errors.tickets?.[index]
            return (
              <div key={field.id} className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">Ticket Type {index + 1}</span>
                    <span className="text-xs text-foreground/60">Configure price, inventory, and sales window.</span>
                  </div>
                  {fields.length > 1 && (
                    <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)} disabled={isPending}>
                      <FiTrash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-6 p-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Ticket Name</label>
                    <Input placeholder="VIP Access" {...form.register(`tickets.${index}.name`)} />
                    {ticketErrors?.name && <p className="text-sm text-destructive">{ticketErrors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Currency</label>
                    <Input placeholder="NGN" {...form.register(`tickets.${index}.currency`)} />
                    {ticketErrors?.currency && <p className="text-sm text-destructive">{ticketErrors.currency.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Price</label>
                    <Input type="number" step="0.01" placeholder="25000" {...form.register(`tickets.${index}.price`)} />
                    {ticketErrors?.price && <p className="text-sm text-destructive">{ticketErrors.price.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Quantity available</label>
                    <Input type="number" placeholder="500" {...form.register(`tickets.${index}.quantity`)} />
                    {ticketErrors?.quantity && <p className="text-sm text-destructive">{ticketErrors.quantity.message}</p>}
                  </div>
                  <Controller
                    control={control}
                    name={`tickets.${index}.salesStart`}
                    render={({ field }) => (
                      <TicketDateTimePicker label="Sales Start" value={field.value ?? ""} onChange={field.onChange} />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`tickets.${index}.salesEnd`}
                    render={({ field }) => (
                      <TicketDateTimePicker label="Sales End" value={field.value ?? ""} onChange={field.onChange} />
                    )}
                  />
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Per Customer Limit</label>
                    <Input type="number" placeholder="e.g. 4" {...form.register(`tickets.${index}.perCustomerLimit`)} />
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiSave className="h-4 w-4" />}
          {mode === "create" ? "Create Event" : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}

