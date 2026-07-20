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
import { viewCommands } from "@/lib/criteriaforge-data"

export function CriteriaForgeCommandMenu({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (view: "constitution" | "evaluation") => void
}) {
  function select(id: string) {
    if (id === "constitution" || id === "evaluation") {
      onNavigate(id)
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
            {viewCommands.map((command) => {
              const Icon = command.icon

              return (
                <CommandItem
                  key={command.id}
                  value={`${command.label} ${command.id}`}
                  onSelect={() => select(command.id)}
                >
                  <Icon />
                  {command.label}
                  <CommandShortcut>{command.shortcut}</CommandShortcut>
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
