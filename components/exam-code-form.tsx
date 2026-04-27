"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function ExamCodeForm() {
  const [examCode, setExamCode] = useState("");

  return (
    <div className="w-full max-w-md">
      <div className="bg-card rounded-2xl p-8 space-y-6 border border-border">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Kora Ikizamini / Reba Amanota</h2>
          <p className="text-muted-foreground text-sm">
            Winiki kode y'ikizamini kugira ngo uhatangire
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Kode y'Ikizamini"
              value={examCode}
              onChange={(e) => setExamCode(e.target.value)}
              className="pl-12 bg-background"
            />
          </div>

          <Button className="w-full" size="lg">
            Komeza
          </Button>

          <div className="text-center space-y-4">
            <p className="text-sm">Nta kode ufite?</p>
            <Button variant="outline" className="w-full">
              Saba Ikizamini
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
