import { useState } from "react";
import { Material } from "@/types/material";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, Pencil, ArrowDownCircle, ArrowUpCircle, HandHelping, Undo2, Download, FileSpreadsheet, Trash2, ShoppingCart, CheckCircle, Clock, XCircle } from "lucide-react";
import { ImageDialog } from "@/components/ImageDialog";
import { MaterialsFilter } from "@/components/MaterialsFilter";
import { MaterialCard } from "@/components/MaterialCard";
import { useIsMobile } from "@/hooks/use-mobile";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
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
  onDelete: (material: Material) => void;
  onQuickAction?: (material: Material, action: "entrada" | "saida" | "emprestimo" | "devolucao") => void;
  onTogglePurchase?: (material: Material, newStatus: "pendente" | "em_cotacao" | "comprado") => void;
  onToggleObsolete?: (material: Material) => void;
  onAddToCart?: (material: Material) => void;
  tipo: "estoque" | "emprestimo" | "consumivel";
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  onClearFilters: () => void;
  userRole?: "admin" | "compras" | "diretor" | "almoxarife" | "financeiro" | null;
}

export function MaterialsTable({ 
  materials, 
  onViewLocation, 
  onEdit, 
  onDelete,
  onQuickAction,
  onTogglePurchase,
  onToggleObsolete,
  onAddToCart,
  tipo,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  locationFilter,
  onLocationFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onClearFilters,
  userRole
}: MaterialsTableProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);
  const isMobile = useIsMobile();

  const uniqueLocations = Array.from(new Set(materials.map((m) => m.localizacao))).sort();
  const uniqueCategories = Array.from(new Set(materials.map((m) => m.categoria).filter(Boolean))).sort() as string[];

  const getStockStatus = (material: Material) => {
    // Materiais obsoletos não geram alerta
    if (material.obsoleto) {
      return { label: "Obsoleto", variant: "secondary" as const };
    }
    // Consumíveis mostram apenas "Consumível" sem status de estoque
    if (material.tipo === "consumivel") {
      return { label: "Consumível", variant: "outline" as const };
    }
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
      const status = getStockStatus(material);
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
        status.label,
        material.valorUnitario ? `R$ ${material.valorUnitario.toFixed(2)}` : "-",
        material.valorUnitario ? `R$ ${valorTotal}` : "-"
      ];
    });

    autoTable(doc, {
      head: [["Código", "Descrição", "Categoria", "Qtd", "Mín", "Máx", "Status", "Valor Unit.", "Valor Total"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
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

  const exportToExcel = () => {
    const excelData = filteredMaterials.map((material) => {
      const status = getStockStatus(material);
      const valorTotal = material.valorUnitario 
        ? (material.valorUnitario * material.quantidadeAtual).toFixed(2)
        : "";
      return {
        "Código": material.codigo,
        "Descrição": material.descricao,
        "Categoria": material.categoria || "",
        "Quantidade": material.quantidadeAtual,
        "Unidade": material.unidadeMedida,
        "Mínimo": material.estoqueMinimo,
        "Máximo": material.estoqueMaximo || "",
        "Status": status.label,
        "Valor Unitário": material.valorUnitario ? material.valorUnitario.toFixed(2) : "",
        "Valor Total": valorTotal,
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipo === "estoque" ? "Estoque" : "Empréstimo");
    
    XLSX.writeFile(wb, `${tipo === "estoque" ? "materiais_estoque" : "materiais_emprestimo"}_${new Date().toISOString().split('T')[0]}.xlsx`);
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

      <div className="flex justify-end gap-2">
        <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar PDF</span>
          <span className="sm:hidden">PDF</span>
        </Button>
        <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar Excel</span>
          <span className="sm:hidden">Excel</span>
        </Button>
      </div>
      
      {/* Mobile: Cards View */}
      {isMobile ? (
        <div className="space-y-3">
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-card rounded-lg border">
              {materials.length === 0 
                ? "Nenhum material cadastrado ainda"
                : "Nenhum material encontrado com os filtros aplicados"}
            </div>
          ) : (
            filteredMaterials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onViewLocation={onViewLocation}
                onEdit={onEdit}
                onDelete={onDelete}
                onQuickAction={onQuickAction}
                onTogglePurchase={onTogglePurchase}
                onToggleObsolete={onToggleObsolete}
                onAddToCart={onAddToCart}
                onImageClick={(url, alt) => setSelectedImage({ url, alt })}
                userRole={userRole}
              />
            ))
          )}
        </div>
      ) : (
      /* Desktop: Table View */
      <div className="rounded-lg border bg-card w-full overflow-hidden">
        <div className="overflow-x-auto w-full max-w-full">
          <Table className="w-full min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 min-w-[48px]">Foto</TableHead>
                <TableHead className="w-16 min-w-[64px]">Código</TableHead>
                <TableHead className="min-w-[120px]">Descrição</TableHead>
                <TableHead className="hidden xl:table-cell w-20 min-w-[80px]">Categ.</TableHead>
                <TableHead className="text-center w-14 min-w-[56px]">Qtd.</TableHead>
                <TableHead className="text-center hidden lg:table-cell w-12 min-w-[48px]">Mín.</TableHead>
                <TableHead className="text-center hidden lg:table-cell w-12 min-w-[48px]">Máx.</TableHead>
                <TableHead className="text-center hidden xl:table-cell w-16 min-w-[64px] text-primary">Comprar</TableHead>
                <TableHead className="text-center hidden xl:table-cell w-16 min-w-[64px]">V.Unit.</TableHead>
                <TableHead className="text-center hidden xl:table-cell w-16 min-w-[64px]">V.Total</TableHead>
                <TableHead className="text-center w-16 min-w-[64px]">Status</TableHead>
                <TableHead className="w-20 min-w-[80px]">Local</TableHead>
                <TableHead className="text-center w-20 min-w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
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
                          className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage({ url: material.fotoUrl!, alt: material.descricao })}
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/40?text=Sem";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">
                          Sem
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-xs">{material.codigo}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={material.descricao}>{material.descricao}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {material.categoria ? (
                        <Badge variant="outline" className="text-[10px]">{material.categoria}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs">
                      {material.tipo === "consumivel" ? (
                        <span className="text-primary" title="Quantidade infinita">∞</span>
                      ) : (
                        <>{material.quantidadeAtual} {material.unidadeMedida}</>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs hidden lg:table-cell">
                      {material.tipo === "consumivel" ? "-" : material.estoqueMinimo}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs hidden lg:table-cell">
                      {material.tipo === "consumivel" ? "-" : material.estoqueMaximo || "-"}
                    </TableCell>
                    <TableCell className="text-center hidden xl:table-cell">
                      {material.tipo === "consumivel" ? (
                        "-"
                      ) : material.estoqueMaximo && material.estoqueMaximo > material.quantidadeAtual ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-semibold text-primary text-xs">
                            {material.estoqueMaximo - material.quantidadeAtual}
                          </span>
                          {onAddToCart && (status.variant === "destructive" || status.variant === "warning") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddToCart(material)}
                              className="h-5 w-5 p-0 hover:bg-primary/10 min-h-0"
                              title={`Adicionar ao pedido`}
                            >
                              <ShoppingCart className="h-3 w-3 text-primary" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs hidden xl:table-cell">
                      {material.valorUnitario ? `R$ ${material.valorUnitario.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs hidden xl:table-cell">
                      {material.valorUnitario 
                        ? `R$ ${(material.valorUnitario * material.quantidadeAtual).toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={status.variant} className="text-[10px] px-1.5">
                        {status.variant === "destructive" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewLocation(material)}
                        className="gap-1 justify-start text-[10px] h-6 px-1 min-h-0"
                      >
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate max-w-[80px]">{material.localizacao}</span>
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1">
                        {/* Quick Actions */}
                        {onQuickAction && userRole !== "diretor" && userRole !== "compras" && (
                          <div className="flex gap-1">
                            {material.tipo === "estoque" ? (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "entrada")}
                                  title="Entrada"
                                  className="h-6 w-6 p-0 min-h-0"
                                >
                                  <ArrowDownCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "saida")}
                                  title="Saída"
                                  className="h-6 w-6 p-0 min-h-0"
                                >
                                  <ArrowUpCircle className="h-3 w-3" />
                                </Button>
                              </>
                            ) : material.tipo === "consumivel" ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => onQuickAction(material, "saida")}
                                title="Saída"
                                className="h-6 w-6 p-0 min-h-0"
                              >
                                <ArrowUpCircle className="h-3 w-3" />
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "emprestimo")}
                                  title="Empréstimo"
                                  className="h-6 w-6 p-0 min-h-0"
                                >
                                  <HandHelping className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "devolucao")}
                                  title="Devolução"
                                  className="h-6 w-6 p-0 min-h-0"
                                >
                                  <Undo2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                        {/* Edit/Delete */}
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(material)}
                            className="h-6 w-6 p-0 min-h-0"
                            disabled={userRole === "diretor" || userRole === "compras"}
                            title="Editar"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDelete(material)}
                            className="h-6 w-6 p-0 min-h-0"
                            disabled={userRole === "diretor" || userRole === "compras"}
                            title="Excluir"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>
      )}
      
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
