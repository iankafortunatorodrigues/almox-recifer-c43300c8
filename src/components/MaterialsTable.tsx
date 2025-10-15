import { useState } from "react";
import { Material } from "@/types/material";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, Pencil, ArrowDownCircle, ArrowUpCircle, HandHelping, Undo2, Download } from "lucide-react";
import { ImageDialog } from "@/components/ImageDialog";
import { MaterialsFilter } from "@/components/MaterialsFilter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MaterialsTableProps {
  materials: Material[];
  onViewLocation: (material: Material) => void;
  onEdit: (material: Material) => void;
  onQuickAction?: (material: Material, action: "entrada" | "saida" | "emprestimo" | "devolucao") => void;
  tipo: "estoque" | "emprestimo";
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

export function MaterialsTable({ 
  materials, 
  onViewLocation, 
  onEdit, 
  onQuickAction, 
  tipo,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  locationFilter,
  onLocationFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onClearFilters
}: MaterialsTableProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  const uniqueLocations = Array.from(new Set(materials.map((m) => m.localizacao))).sort();
  const uniqueCategories = Array.from(new Set(materials.map((m) => m.categoria).filter(Boolean))).sort() as string[];

  const getStockStatus = (material: Material) => {
    if (material.quantidadeAtual <= material.estoqueMinimo) {
      return { label: "Crítico", variant: "destructive" as const };
    }
    if (material.quantidadeAtual <= material.estoqueMinimo * 1.5) {
      return { label: "Baixo", variant: "warning" as const };
    }
    return { label: "Normal", variant: "success" as const };
  };

  const filteredMaterials = materials.filter((material) => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      if (
        !material.codigo.toLowerCase().includes(searchLower) &&
        !material.descricao.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      const status = getStockStatus(material);
      if (statusFilter === "critical" && status.variant !== "destructive") return false;
      if (statusFilter === "low" && status.variant !== "warning") return false;
      if (statusFilter === "normal" && status.variant !== "success") return false;
    }

    // Location filter
    if (locationFilter !== "all" && material.localizacao !== locationFilter) {
      return false;
    }

    // Category filter
    if (categoryFilter !== "all" && material.categoria !== categoryFilter) {
      return false;
    }

    return true;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(tipo === "estoque" ? "Materiais de Estoque" : "Materiais de Empréstimo", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Data de geração: ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);
    
    const tableData = filteredMaterials.map((material) => {
      const valorTotal = material.valorUnitario 
        ? (material.valorUnitario * material.quantidadeAtual).toFixed(2)
        : "-";
      return [
        material.codigo,
        material.descricao,
        material.categoria || "-",
        `${material.quantidadeAtual} ${material.unidadeMedida}`,
        material.estoqueMinimo.toString(),
        material.estoqueMaximo?.toString() || "-",
        material.valorUnitario ? `R$ ${material.valorUnitario.toFixed(2)}` : "-",
        material.valorUnitario ? `R$ ${valorTotal}` : "-",
        material.localizacao
      ];
    });

    autoTable(doc, {
      head: [["Código", "Descrição", "Categoria", "Qtd", "Mín", "Máx", "Valor Unit.", "Valor Total", "Localização"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [71, 85, 105] },
    });

    const totalValue = filteredMaterials.reduce((sum, m) => {
      if (m.valorUnitario) {
        return sum + (m.valorUnitario * m.quantidadeAtual);
      }
      return sum;
    }, 0);

    if (totalValue > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 35;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Valor Total em Estoque: R$ ${totalValue.toFixed(2)}`, 14, finalY + 10);
    }

    doc.save(`${tipo === "estoque" ? "materiais_estoque" : "materiais_emprestimo"}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-4">
      <MaterialsFilter
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        locationFilter={locationFilter}
        onLocationFilterChange={onLocationFilterChange}
        locations={uniqueLocations}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={onCategoryFilterChange}
        categories={uniqueCategories}
        onClearFilters={onClearFilters}
      />

      <div className="flex justify-end">
        <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar PDF</span>
          <span className="sm:hidden">PDF</span>
        </Button>
      </div>
      
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 sm:w-20">Foto</TableHead>
              <TableHead className="min-w-[80px]">Código</TableHead>
              <TableHead className="min-w-[150px]">Descrição</TableHead>
              <TableHead className="hidden lg:table-cell">Categoria</TableHead>
              <TableHead className="text-center min-w-[100px]">Qtd.</TableHead>
              <TableHead className="text-center hidden md:table-cell">Mín.</TableHead>
              <TableHead className="text-center hidden md:table-cell">Máx.</TableHead>
              <TableHead className="text-center hidden lg:table-cell">Valor Unit.</TableHead>
              <TableHead className="text-center hidden lg:table-cell">Valor Total</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Status</TableHead>
              <TableHead className="min-w-[120px]">Local</TableHead>
              <TableHead className="text-center min-w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  {materials.length === 0 
                    ? "Nenhum material cadastrado ainda"
                    : "Nenhum material encontrado com os filtros aplicados"}
                </TableCell>
              </TableRow>
            ) : (
              filteredMaterials.map((material) => {
                const status = getStockStatus(material);
                return (
                  <TableRow key={material.id}>
                    <TableCell>
                      {material.fotoUrl ? (
                        <img 
                          src={material.fotoUrl} 
                          alt={material.descricao}
                          className="w-8 h-8 sm:w-12 sm:h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage({ url: material.fotoUrl!, alt: material.descricao })}
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/48?text=Sem+Foto";
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          <span className="hidden sm:inline text-xs">Sem foto</span>
                          <span className="sm:hidden">-</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-xs sm:text-sm">{material.codigo}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{material.descricao}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {material.categoria ? (
                        <Badge variant="outline" className="text-xs">{material.categoria}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs sm:text-sm">
                      {material.quantidadeAtual} <span className="hidden sm:inline">{material.unidadeMedida}</span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs hidden md:table-cell">
                      {material.estoqueMinimo}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs hidden md:table-cell">
                      {material.estoqueMaximo}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs hidden lg:table-cell">
                      {material.valorUnitario ? `R$ ${material.valorUnitario.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs hidden lg:table-cell">
                      {material.valorUnitario 
                        ? `R$ ${(material.valorUnitario * material.quantidadeAtual).toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <Badge variant={status.variant} className="text-xs">
                        {status.variant === "destructive" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewLocation(material)}
                          className="gap-1 justify-start text-xs h-7 px-2"
                        >
                          <MapPin className="h-3 w-3" />
                          <span className="hidden sm:inline">{material.localizacao}</span>
                          <span className="sm:hidden">{material.localizacao.slice(0, 8)}...</span>
                        </Button>
                        {onQuickAction && (
                          <div className="flex gap-1">
                            {material.tipo === "estoque" ? (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "entrada")}
                                  title="Entrada rápida"
                                  className="flex-1 h-6 px-1"
                                >
                                  <ArrowDownCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "saida")}
                                  title="Saída rápida"
                                  className="flex-1 h-6 px-1"
                                >
                                  <ArrowUpCircle className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "emprestimo")}
                                  title="Empréstimo rápido"
                                  className="flex-1 h-6 px-1"
                                >
                                  <HandHelping className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "devolucao")}
                                  title="Devolução rápida"
                                  className="flex-1 h-6 px-1"
                                >
                                  <Undo2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(material)}
                        className="gap-1 h-7 px-2"
                      >
                        <Pencil className="h-3 w-3" />
                        <span className="hidden sm:inline text-xs">Editar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {selectedImage && (
        <ImageDialog
          imageUrl={selectedImage.url}
          alt={selectedImage.alt}
          open={!!selectedImage}
          onOpenChange={(open) => !open && setSelectedImage(null)}
        />
      )}
    </div>
  );
}
