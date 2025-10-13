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

interface MaterialsFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  locations: string[];
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: string[];
  onClearFilters: () => void;
}

export function MaterialsFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  locationFilter,
  onLocationFilterChange,
  locations,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  onClearFilters,
}: MaterialsFilterProps) {
  const hasActiveFilters = searchQuery || statusFilter !== "all" || locationFilter !== "all" || categoryFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          placeholder="Buscar por código ou descrição..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="md:col-span-2"
        />

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="Status do estoque" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="critical">Estoque Crítico</SelectItem>
            <SelectItem value="low">Estoque Baixo</SelectItem>
            <SelectItem value="normal">Estoque Normal</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Select value={locationFilter} onValueChange={onLocationFilterChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Localização" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as localizações</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
          <SelectTrigger className="md:col-span-2">
            <SelectValue placeholder="Categoria de Utilização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
