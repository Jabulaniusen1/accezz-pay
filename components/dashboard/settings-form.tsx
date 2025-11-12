"use client"

import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import type { Organizer } from "@/types/database"
import { saveBranding, saveSettings } from "@/app/dashboard/settings/actions"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { PaystackBank } from "@/lib/paystack"
import { Check, ChevronsUpDown, Loader2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

type SettingsFormProps = {
  organizer: Organizer
  banks: PaystackBank[]
  defaultTab?: 'branding' | 'profile'
}

export function SettingsForm({ organizer, banks, defaultTab }: SettingsFormProps) {
  const router = useRouter()
  const [brandingPending, startBrandingTransition] = useTransition()
  const [settingsPending, startSettingsTransition] = useTransition()
  const { toast } = useToast()
  const branding = organizer.branding ?? {}
  const hasBankDirectory = banks.length > 0

  const initialBankCode = ((organizer.bank_details?.bankCode as string | undefined) ?? "").trim()
  const initialBankName = ((organizer.bank_details?.bankName as string | undefined) ?? "").trim()
  const initialAccountNumberNumeric = ((organizer.bank_details?.accountNumber as string | undefined) ?? "").replace(/\D/g, "")
  const initialAccountName = ((organizer.bank_details?.accountName as string | undefined) ?? "").trim()

  const initialBankSelection = useMemo<PaystackBank | null>(() => {
    if (!initialBankCode && !initialBankName) {
      return null
    }

    const match = banks.find((bank) => bank.code === initialBankCode)
    if (match) {
      return match
    }

    if (initialBankCode) {
      return {
        name: initialBankName || initialBankCode,
        code: initialBankCode,
        slug: initialBankName ? initialBankName.toLowerCase().replace(/\s+/g, "-") : null,
      }
    }

    return null
  }, [banks, initialBankCode, initialBankName])

  const [selectedBank, setSelectedBank] = useState<PaystackBank | null>(initialBankSelection)
  useEffect(() => {
    setSelectedBank(initialBankSelection)
    if (initialBankSelection && initialAccountNumberNumeric) {
      lastLookupKeyRef.current = `${initialBankSelection.code}-${initialAccountNumberNumeric}`
    } else {
      lastLookupKeyRef.current = null
    }
  }, [initialAccountNumberNumeric, initialBankSelection])

  const [accountNumber, setAccountNumber] = useState<string>(initialAccountNumberNumeric)
  const [accountName, setAccountName] = useState<string>(initialAccountName)
  const [accountLookupState, setAccountLookupState] = useState<"idle" | "loading" | "success" | "error">(
    initialAccountNumberNumeric && initialAccountName ? "success" : "idle",
  )
  const [accountLookupMessage, setAccountLookupMessage] = useState<string | null>(
    initialAccountNumberNumeric && initialAccountName ? `Verified as ${initialAccountName}` : null,
  )
  const [isBankPopoverOpen, setIsBankPopoverOpen] = useState(false)

  const requiredAccountNumberLengths = useMemo(() => [10, 11] as const, [])
  const accountLookupRequestIdRef = useRef(0)
  const lastLookupKeyRef = useRef<string | null>(
    selectedBank && initialAccountNumberNumeric ? `${selectedBank.code}-${initialAccountNumberNumeric}` : null,
  )

  const [primaryColor, setPrimaryColor] = useState((branding.primaryColor as string) ?? "#6B21A8")
  const [secondaryColor, setSecondaryColor] = useState((branding.secondaryColor as string) ?? "#F3E8FF")
  const [fontFamily, setFontFamily] = useState((branding.fontFamily as string) ?? "Inter")
  const [payoutSchedule, setPayoutSchedule] = useState(organizer.payout_schedule ?? "manual")
  const [logoPreview, setLogoPreview] = useState<string | null>((branding.logoUrl as string) ?? null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  const minAccountDigits = requiredAccountNumberLengths[0]
  const maxAccountDigits = requiredAccountNumberLengths[requiredAccountNumberLengths.length - 1]

  const resetAccountLookupState = useCallback(() => {
    setAccountLookupState("idle")
    setAccountLookupMessage(null)
    accountLookupRequestIdRef.current = 0
    lastLookupKeyRef.current = null
  }, [])

  useEffect(() => {
    setAccountNumber(initialAccountNumberNumeric)
    setAccountName(initialAccountName)

    if (initialAccountNumberNumeric && initialAccountName) {
      setAccountLookupState("success")
      setAccountLookupMessage(`Verified as ${initialAccountName}`)
      if (initialBankSelection) {
        lastLookupKeyRef.current = `${initialBankSelection.code}-${initialAccountNumberNumeric}`
      }
    } else {
      resetAccountLookupState()
    }
  }, [
    initialAccountName,
    initialAccountNumberNumeric,
    initialBankSelection,
    resetAccountLookupState,
  ])

  const resolveAccountWithPaystack = useCallback(
    async (bankCode: string, acctNumber: string) => {
      if (!bankCode || !acctNumber) {
        return
      }

      const lookupKey = `${bankCode}-${acctNumber}`
      if (lookupKey === lastLookupKeyRef.current) {
        return
      }

      lastLookupKeyRef.current = lookupKey
      accountLookupRequestIdRef.current += 1
      const requestId = accountLookupRequestIdRef.current

      setAccountLookupState("loading")
      setAccountLookupMessage("Validating with Paystack...")

      try {
        const response = await fetch("/api/paystack/resolve-account", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bankCode,
            accountNumber: acctNumber,
          }),
        })

        const payload = await response.json().catch(() => ({}))

        if (requestId !== accountLookupRequestIdRef.current) {
          return
        }

        if (!response.ok || !payload?.success) {
          const errorMessage = payload?.error ?? "Unable to validate bank details with Paystack."
          throw new Error(errorMessage)
        }

        const resolved = (payload?.data as { accountName?: string; accountNumber?: string; isMock?: boolean }) ?? {}
        const resolvedName = (resolved.accountName ?? "").trim()

        if (resolvedName) {
          setAccountName(resolvedName)
        }

        setAccountLookupState("success")
        setAccountLookupMessage(
          resolvedName
            ? resolved.isMock
              ? `Account verified (mock): ${resolvedName}`
              : `Account verified for ${resolvedName}.`
            : resolved.isMock
              ? "Bank details validated (mock)."
              : "Bank details validated.",
        )
      } catch (error) {
        if (requestId !== accountLookupRequestIdRef.current) {
          return
        }

        lastLookupKeyRef.current = null
        setAccountLookupState("error")
        setAccountLookupMessage(error instanceof Error ? error.message : "Unable to validate bank details.")
      }
    },
    [],
  )

  const handleBankSelection = useCallback(
    (bank: PaystackBank | null) => {
      const previousBankCode = selectedBank?.code
      setSelectedBank(bank)
      setIsBankPopoverOpen(false)
      lastLookupKeyRef.current = null

      if (!bank) {
        setAccountNumber("")
        setAccountName("")
        resetAccountLookupState()
        return
      }

      if (!accountNumber || bank.code !== previousBankCode) {
        setAccountNumber("")
        setAccountName("")
        resetAccountLookupState()
        return
      }

      if (requiredAccountNumberLengths.includes(accountNumber.length as (typeof requiredAccountNumberLengths)[number])) {
        void resolveAccountWithPaystack(bank.code, accountNumber)
      }
    },
    [accountNumber, requiredAccountNumberLengths, resolveAccountWithPaystack, resetAccountLookupState, selectedBank],
  )

  const handleAccountNumberChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, maxAccountDigits)
      setAccountNumber(digitsOnly)
      setAccountLookupMessage(null)
      setAccountLookupState("idle")
      lastLookupKeyRef.current = null

      if (!selectedBank) {
        return
      }

      if (digitsOnly.length === 0) {
        setAccountName("")
        return
      }

      if (requiredAccountNumberLengths.includes(digitsOnly.length as (typeof requiredAccountNumberLengths)[number])) {
        void resolveAccountWithPaystack(selectedBank.code, digitsOnly)
      } else if (digitsOnly.length < minAccountDigits) {
        setAccountName("")
      }
    },
    [
      maxAccountDigits,
      minAccountDigits,
      requiredAccountNumberLengths,
      resolveAccountWithPaystack,
      selectedBank,
    ],
  )

  const handleBrandingSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    formData.set("primaryColor", primaryColor)
    formData.set("secondaryColor", secondaryColor)
    formData.set("fontFamily", fontFamily)

    startBrandingTransition(async () => {
      const result = await saveBranding(formData)
      if (!result?.success) {
        toast({
          title: "Unable to save branding",
          description: "Please try again or contact support if the issue persists.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Branding updated",
        description: "Your checkout experience has been refreshed.",
      })
      router.refresh()
    })
  }

  const handleSettingsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const trimmedAccountNumber = accountNumber.trim()
    const hasAccountNumber = trimmedAccountNumber.length > 0
    const selectedBankCode = selectedBank?.code ?? ""

    formData.set("bank_name", selectedBank?.name ?? "")
    formData.set("bank_code", selectedBankCode)
    formData.set("account_number", trimmedAccountNumber)
    formData.set("account_name", accountName)
    formData.set("payout_schedule", payoutSchedule)

    if (hasAccountNumber && !selectedBankCode) {
      toast({
        title: "Select a bank",
        description: "Choose a settlement bank before entering an account number.",
        variant: "destructive",
      })
      return
    }

    if (
      hasAccountNumber &&
      !requiredAccountNumberLengths.some((length) => length === trimmedAccountNumber.length)
    ) {
      toast({
        title: "Account number looks incomplete",
        description: `Enter a ${requiredAccountNumberLengths.join(" or ")} digit account number.`,
        variant: "destructive",
      })
      return
    }

    if (accountLookupState === "loading") {
      toast({
        title: "Still validating",
        description: "Please wait for Paystack to finish validating the account details.",
        variant: "destructive",
      })
      return
    }

    if (hasAccountNumber && accountLookupState !== "success") {
      toast({
        title: "Bank details not verified",
        description: accountLookupMessage ?? "Re-check the account number and try again.",
        variant: "destructive",
      })
      return
    }

    startSettingsTransition(async () => {
      const result = await saveSettings(formData)
      if (!result?.success) {
        toast({
          title: "Settings not saved",
          description: result?.error ?? "Please review your details and try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: result?.warning ? "Profile saved with warning" : "Profile updated",
        description: result?.warning
          ? result.resolution
            ? `${result.warning} — ${result.resolution}`
            : result.warning
          : result?.resolution ?? "Organizer details saved successfully.",
        variant: result?.warning ? "default" : "default",
      })

      router.refresh()
    })
  }

  const handleLogoBoxClick = () => fileInputRef.current?.click()

  const handleLogoKeyPress = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleLogoBoxClick()
    }
  }

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setLogoPreview((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev)
        }
        return URL.createObjectURL(file)
      })
    }
  }

  const initialTab = defaultTab ?? 'branding'

  return (
    <Tabs defaultValue={initialTab} className="space-y-8">
      <TabsList className="flex w-full max-w-2xl justify-between rounded-full bg-white/70 p-1 ring-1 ring-slate-200 backdrop-blur">
        <TabsTrigger
          value="branding"
          className="flex-1 rounded-full px-6 py-2 text-sm font-medium text-slate-500 transition data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[var(--brand-primary)]/25"
        >
          Branding
        </TabsTrigger>
        <TabsTrigger
          value="profile"
          className="flex-1 rounded-full px-6 py-2 text-sm font-medium text-slate-500 transition data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[var(--brand-primary)]/25"
        >
          Profile
        </TabsTrigger>
      </TabsList>

      <TabsContent value="branding">
        <Card className="rounded-[32px] border-0 bg-white/90 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-900">Branding</CardTitle>
            <CardDescription className="text-slate-500">
              Customize your storefront colours, typography, and logo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-8" onSubmit={handleBrandingSubmit} encType="multipart/form-data">
              <div className="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleLogoBoxClick}
                    onKeyDown={handleLogoKeyPress}
                    className="group relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 transition hover:border-[var(--brand-primary)] hover:bg-white hover:shadow-lg focus-visible:border-[var(--brand-primary)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30 focus-visible:outline-none"
                  >
                    {logoPreview ? (
                      <Image
                        src={logoPreview}
                        alt="Organizer logo"
                        fill
                        sizes="160px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-3xl font-semibold text-slate-300">
                        {organizer.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="absolute bottom-3 right-3 rounded-full bg-white/80 p-2 shadow-sm backdrop-blur group-hover:bg-white">
                      <Pencil className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="logo"
                    name="logo"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <p className="text-xs text-slate-500">Click the card to upload. PNG or JPG, max 2MB.</p>
                </div>

                <div className="flex-1 space-y-8">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor" className="text-sm font-medium text-slate-600">
                        Primary Colour
                      </Label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                        <div className="relative h-12 w-12">
                          <input
                            type="color"
                            id="primaryColorPicker"
                            value={primaryColor}
                            onChange={(event) => setPrimaryColor(event.target.value)}
                            className="h-full w-full cursor-pointer rounded-xl border border-transparent bg-transparent p-0 shadow-sm transition hover:border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30"
                            aria-label="Select primary color"
                          />
                        </div>
                        <Input
                          id="primaryColor"
                          name="primaryColor"
                          value={primaryColor}
                          onChange={(event) => setPrimaryColor(event.target.value)}
                          placeholder="#6B21A8"
                          className="h-12 rounded-xl border-slate-100 bg-white font-mono text-sm uppercase text-slate-700 focus-visible:border-[var(--brand-primary)]/40 focus-visible:ring-[var(--brand-primary)]/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor" className="text-sm font-medium text-slate-600">
                        Accent Colour
                      </Label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                        <div className="relative h-12 w-12">
                          <input
                            type="color"
                            id="secondaryColorPicker"
                            value={secondaryColor}
                            onChange={(event) => setSecondaryColor(event.target.value)}
                            className="h-full w-full cursor-pointer rounded-xl border border-transparent bg-transparent p-0 shadow-sm transition hover:border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30"
                            aria-label="Select secondary color"
                          />
                        </div>
                        <Input
                          id="secondaryColor"
                          name="secondaryColor"
                          value={secondaryColor}
                          onChange={(event) => setSecondaryColor(event.target.value)}
                          placeholder="#F3E8FF"
                          className="h-12 rounded-xl border-slate-100 bg-white font-mono text-sm uppercase text-slate-700 focus-visible:border-[var(--brand-primary)]/40 focus-visible:ring-[var(--brand-primary)]/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fontFamily" className="text-sm font-medium text-slate-600">
                      Typography
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                      <Select value={fontFamily} onValueChange={(value) => setFontFamily(value)}>
                        <SelectTrigger className="w-full rounded-xl border-slate-200 bg-white/80 text-sm text-slate-600 shadow-sm sm:w-64" data-slot="font-select">
                          <SelectValue placeholder="Choose a font" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="Geist">Geist</SelectItem>
                          <SelectItem value="Poppins">Poppins</SelectItem>
                          <SelectItem value="Roboto">Roboto</SelectItem>
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="fontFamily" value={fontFamily} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse items-stretch justify-end gap-3 pt-2 sm:flex-row sm:items-center">
                <Button
                  type="reset"
                  variant="ghost"
                  onClick={() => {
                    const resetLogo = (branding.logoUrl as string) ?? null
                    setLogoPreview((prev) => {
                      if (prev && prev.startsWith("blob:")) {
                        URL.revokeObjectURL(prev)
                      }
                      return resetLogo
                    })
                    setPrimaryColor((branding.primaryColor as string) ?? "#6B21A8")
                    setSecondaryColor((branding.secondaryColor as string) ?? "#F3E8FF")
                    setFontFamily((branding.fontFamily as string) ?? "Inter")
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={brandingPending}
                  className="rounded-full bg-[var(--brand-primary)] px-6 text-white hover:bg-[var(--brand-primary)]/90"
                >
                  {brandingPending ? "Saving..." : "Save Branding"}
                </Button>
              </div>
          </form>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="profile">
        <Card className="rounded-[32px] border-0 bg-white/90 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-900">Profile</CardTitle>
            <CardDescription className="text-slate-500">
              Keep organizer contact details, settlement accounts, and integrations up to date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-8" onSubmit={handleSettingsSubmit}>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact_person" className="text-sm font-medium text-slate-600">
                    Contact Person
                  </Label>
                  <Input
                    id="contact_person"
                    name="contact_person"
                    defaultValue={organizer.contact_person ?? ""}
                    placeholder="Jane Doe"
                    className="h-12 rounded-xl border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus-visible:border-[var(--brand-primary)]/40 focus-visible:ring-[var(--brand-primary)]/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-slate-600">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={organizer.phone ?? ""}
                    placeholder="+2348012345678"
                    className="h-12 rounded-xl border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus-visible:border-[var(--brand-primary)]/40 focus-visible:ring-[var(--brand-primary)]/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium text-slate-600">
                    Country
                  </Label>
                  <Input
                    id="country"
                    name="country"
                    defaultValue={organizer.country ?? ""}
                    placeholder="NG"
                    className="h-12 rounded-xl border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus-visible:border-[var(--brand-primary)]/40 focus-visible:ring-[var(--brand-primary)]/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payout_schedule" className="text-sm font-medium text-slate-600">
                    Payout cadence
                  </Label>
                  <Select value={payoutSchedule} onValueChange={setPayoutSchedule}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white text-sm text-slate-700 shadow-sm">
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="payout_schedule" value={payoutSchedule} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook_url" className="text-sm font-medium text-slate-600">
                  Webhook URL
                </Label>
                <Input
                  id="webhook_url"
                  name="webhook_url"
                  defaultValue={organizer.webhook_url ?? ""}
                  placeholder="https://example.com/webhooks/payments"
                  className="h-12 rounded-xl border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus-visible:border-[var(--brand-primary)]/40 focus-visible:ring-[var(--brand-primary)]/20"
                />
              </div>

              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/60 p-6">
                {hasBankDirectory ? (
                  <div className="grid gap-6 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:items-start">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600">Settlement bank</Label>
                      <Popover open={isBankPopoverOpen} onOpenChange={setIsBankPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={isBankPopoverOpen}
                            className="flex w-full items-center justify-between"
                          >
                            <span className="truncate">{selectedBank ? selectedBank.name : "Select bank"}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[min(360px,calc(100vw-2rem))] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search banks..." />
                            <CommandEmpty>No bank found.</CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                {banks.map((bank) => (
                                  <CommandItem
                                    key={bank.code}
                                    value={`${bank.name} ${bank.code}`}
                                    onSelect={() => handleBankSelection(bank)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedBank?.code === bank.code ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    <span className="truncate">{bank.name}</span>
                                    <span className="ml-auto text-xs text-muted-foreground">{bank.code}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              <CommandItem onSelect={() => handleBankSelection(null)}>
                                <Check className="mr-2 h-4 w-4 opacity-0" />
                                Clear selection
                              </CommandItem>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-foreground/60">Pick your bank, then enter the account number.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account_number">Account Number</Label>
                      <Input
                        id="account_number"
                        name="account_number"
                        value={accountNumber}
                        onChange={handleAccountNumberChange}
                        placeholder="01234567890"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={maxAccountDigits}
                        disabled={hasBankDirectory && !selectedBank}
                        aria-describedby="account-number-feedback"
                        autoComplete="off"
                      />
                      <div className="flex items-center gap-2 text-xs" id="account-number-feedback">
                        {accountLookupState === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        <span
                          className={cn(
                            accountLookupMessage
                              ? accountLookupState === "error"
                                ? "text-destructive"
                                : "text-foreground/60"
                              : "text-foreground/50",
                          )}
                        >
                          {accountLookupMessage ??
                            `Enter a ${requiredAccountNumberLengths.join(" or ")} digit account number to fetch the account name.`}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bank_name_manual">Bank Name</Label>
                      <Input
                        id="bank_name_manual"
                        value={selectedBank?.name ?? ""}
                        onChange={(event) => {
                          const value = event.target.value
                          resetAccountLookupState()
                          setSelectedBank((prev) =>
                            value
                              ? {
                                  name: value,
                                  code: prev?.code ?? "",
                                  slug: prev?.slug,
                                }
                              : prev?.code
                                ? {
                                    name: "",
                                    code: prev.code,
                                    slug: prev.slug,
                                  }
                                : null,
                          )
                        }}
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_code_manual">Bank Code</Label>
                      <Input
                        id="bank_code_manual"
                        value={selectedBank?.code ?? ""}
                        onChange={(event) => {
                          const value = event.target.value.trim()
                          resetAccountLookupState()
                          setSelectedBank((prev) => {
                            if (!value && !(prev?.name)) {
                              return null
                            }
                            return {
                              name: prev?.name ?? "",
                              code: value,
                              slug: prev?.slug,
                            }
                          })
                        }}
                        placeholder="e.g. 058"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="account_name" className="text-sm font-medium text-slate-600">
                      Account name
                    </Label>
                    <Input
                      id="account_name"
                      name="account_name"
                      value={accountName}
                      readOnly
                      placeholder={
                        selectedBank
                          ? accountLookupState === "loading"
                            ? "Validating..."
                            : "Account name will appear after validation"
                          : "Select a bank to continue"
                      }
                      className="bg-muted/50"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_code_display" className="text-sm font-medium text-slate-600">
                      Bank code
                    </Label>
                    <Input
                      id="bank_code_display"
                      value={selectedBank?.code ?? ""}
                      readOnly
                      placeholder="—"
                      className="bg-muted/50"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <input type="hidden" name="bank_code" value={selectedBank?.code ?? ""} />
                <input type="hidden" name="bank_name" value={selectedBank?.name ?? ""} />

                <p className="mt-3 text-xs text-foreground/60">
                  We validate these details with Paystack before saving so payouts reach the correct account.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={settingsPending}
                  className="rounded-full bg-[var(--brand-primary)] px-6 text-white hover:bg-[var(--brand-primary)]/90"
                >
                  {settingsPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
          </form>
        </CardContent>
      </Card>
      </TabsContent>
    </Tabs>
  )
}
