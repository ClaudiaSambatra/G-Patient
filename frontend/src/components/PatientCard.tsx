import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Calendar, FileText, User } from "lucide-react";

export function PatientCard() {
  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <User size={24} strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="text-xl">Jean Dupont</CardTitle>
            <CardDescription className="text-sm mt-1">
              ID Patient: #PT-84920 • Né(e) le 14/05/1982
            </CardDescription>
          </div>
        </div>
        <Badge className="bg-accent text-accent-foreground hover:bg-accent/90 font-medium">
          Dossier Actif
        </Badge>
      </CardHeader>
      
      <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="label-ihm flex items-center gap-2 mb-1.5">
              <Activity size={14} /> Groupe Sanguin
            </h4>
            <p className="text-base font-medium">O Positif (O+)</p>
          </div>
          
          <div>
            <h4 className="label-ihm flex items-center gap-2 mb-1.5">
              <FileText size={14} /> Allergies Connues
            </h4>
            <p className="text-[14px]">Pénicilline, Arachides</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
            <h4 className="label-ihm flex items-center gap-2 mb-3">
              <Calendar size={14} /> Prochaine Consultation
            </h4>
            <p className="font-medium text-base mb-1">Dr. Martin (Cardiologie)</p>
            <p className="text-[14px] text-muted-foreground mb-4">
              Mardi 12 Octobre 2023 - 14h30
            </p>
            <Button className="w-full font-medium" variant="default">
              Voir le dossier médical
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
