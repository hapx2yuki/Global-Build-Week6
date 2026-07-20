"use client"

import {
  BookOpenText,
  CircleCheck,
  FileText,
  Settings2,
} from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { stages } from "@/lib/criteriaforge-data"
import type { StageId, UiLocale } from "@/lib/criteriaforge/ui-types"
import { uiText } from "@/lib/criteriaforge/ui-types"

export function CriteriaForgeCommandMenu({
  open,
  onOpenChange,
  onNavigate,
  locale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (view: StageId) => void
  locale: UiLocale
}) {
  function select(id: string) {
    if (stages.some((stage) => stage.id === id)) {
      onNavigate(id as StageId)
    }
    onOpenChange(false)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="CriteriaForge commands"
      description="Move through the constitution workspace."
    >
      <Command>
        <CommandInput placeholder="Search views, criteria, or actions…" />
        <CommandList>
          <CommandEmpty>No matching command.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {stages.map((stage, index) => {
              const Icon = stage.icon
              const id = stage.id as StageId

              return (
                <CommandItem
                  key={stage.id}
                  value={`${uiText[locale].stages[id]} ${stage.id}`}
                  onSelect={() => select(stage.id)}
                >
                  <Icon />
                  {uiText[locale].stages[id]}
                  <CommandShortcut>⌘{index + 1}</CommandShortcut>
                </CommandItem>
              )
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Project">
            <CommandItem onSelect={() => onOpenChange(false)}>
              <FileText />
              Open exported contract
            </CommandItem>
            <CommandItem onSelect={() => onOpenChange(false)}>
              <CircleCheck />
              Inspect compile safeguards
            </CommandItem>
            <CommandItem onSelect={() => onOpenChange(false)}>
              <BookOpenText />
              Review source index
            </CommandItem>
            <CommandItem onSelect={() => onOpenChange(false)}>
              <Settings2 />
              Project settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
