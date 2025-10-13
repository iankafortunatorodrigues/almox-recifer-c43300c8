import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface LoansFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  responsibleFilter: string;
  onResponsibleFilterChange: (value: string) => void;
  daysFilter: string;
  onDaysFilterChange: (value: string) => void;
  responsibles: string[];
  onClearFilters: () => void;
}

export function LoansFilter({
  searchQuery,
  onSearchChange,
  responsibleFilter,
  onResponsibleFilterChange,
  daysFilter,
  onDaysFilterChange,
  responsibles,
  onClearFilters,
}: LoansFilterProps) {
  const hasActiveFilters = searchQuery || responsibleFilter !== "all" || daysFilter !== "all";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Input
        placeholder="Buscar material..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="md:col-span-2"
      />

      <Select value={responsibleFilter} onValueChange={onResponsibleFilterChange}>
        <SelectTrigger>
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os responsáveis</SelectItem>
          {responsibles.map((responsible) => (
            <SelectItem key={responsible} value={responsible}>
              {responsible}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Select value={daysFilter} onValueChange={onDaysFilterChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Tempo emprestado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="recent">Até 3 dias</SelectItem>
            <SelectItem value="medium">4 a 7 dias</SelectItem>
            <SelectItem value="overdue">Mais de 7 dias</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearFilters}
            title="Limpar filtros"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
