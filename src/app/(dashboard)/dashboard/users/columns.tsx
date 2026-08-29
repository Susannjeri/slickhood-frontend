"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type User = {
  name: string | null;
  email: string;
  registrationDate: string;
  lastLogin: string;
  registrationIp: string;
  country: string | null;
  city: string | null;
  source: "LOCAL" | "GOOGLE" | string; // flexible for now
  active: boolean;
};





