import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Search } from "lucide-react";

interface MovementsFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  tipoFilter: string;
  onTipoChange: (value: string) => void;
  responsavelFilter: string;
  onResponsavelChange: (value: string) => void;
  responsaveis: string[];
  onClearFilters: () => void;
}

export function MovementsFilter({
  searchQuery,
  onSearchChange,
  tipoFilter,
  onTipoChange,
  responsavelFilter,
  onResponsavelChange,
  responsaveis,
  onClearFilters,
}: MovementsFilterProps) {
  const hasActiveFilters = searchQuery || tipoFilter || responsavelFilter;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por material..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={tipoFilter} onValueChange={onTipoChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="entrada">Entrada</SelectItem>
          <SelectItem value="saida">Saída</SelectItem>
          <SelectItem value="emprestimo">Empréstimo</SelectItem>
          <SelectItem value="devolucao">Devolução</SelectItem>
        </SelectContent>
      </Select>

      <Select value={responsavelFilter} onValueChange={onResponsavelChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {responsaveis.map((resp) => (
            <SelectItem key={resp} value={resp}>
              {resp}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
