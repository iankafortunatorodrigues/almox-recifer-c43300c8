import { useState } from "react";
import { Movimentacao, Material } from "@/types/material";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownCircle, ArrowUpCircle, Pencil, Trash2, Download, HandHelping, Undo2 } from "lucide-react";
import { ImageDialog } from "@/components/ImageDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface HistoryTableProps {
  movements: Movimentacao[];
  materials: Material[];
  onEdit?: (movement: Movimentacao) => void;
  onDelete?: (movement: Movimentacao) => void;
}

export function HistoryTable({ movements, materials, onEdit, onDelete }: HistoryTableProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterResponsavel, setFilterResponsavel] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  const getMaterialName = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    return material ? `${material.codigo} - ${material.descricao}` : "Material não encontrado";
  };

  const getMaterial = (materialId: string) => {
    return materials.find((m) => m.id === materialId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMovementLabel = (tipo: string) => {
    switch (tipo) {
      case "entrada": return "Entrada";
      case "saida": return "Saída";
      case "emprestimo": return "Empréstimo";
      case "devolucao": return "Devolução";
      default: return tipo;
    }
  };

  const getMovementIcon = (tipo: string) => {
    switch (tipo) {
      case "entrada": return <ArrowDownCircle className="h-3 w-3" />;
      case "saida": return <ArrowUpCircle className="h-3 w-3" />;
      case "emprestimo": return <HandHelping className="h-3 w-3" />;
      case "devolucao": return <Undo2 className="h-3 w-3" />;
      default: return null;
    }
  };

  const getMovementVariant = (tipo: string): "success" | "destructive" | "default" | "secondary" => {
    switch (tipo) {
      case "entrada": return "success";
      case "saida": return "destructive";
      case "emprestimo": return "secondary";
      case "devolucao": return "default";
      default: return "default";
    }
  };

  const availableCategories = Array.from(new Set(
    materials
      .filter(m => m.categoria)
      .map(m => m.categoria!)
  )).sort();

  const filteredMovements = movements.filter((movement) => {
    if (filterType !== "all" && movement.tipo !== filterType) return false;
    if (filterResponsavel && !movement.responsavel.toLowerCase().includes(filterResponsavel.toLowerCase())) return false;
    if (filterCategoria !== "all") {
      const material = getMaterial(movement.materialId);
      if (!material?.categoria || material.categoria !== filterCategoria) return false;
    }
    if (filterStartDate) {
      const movementDate = new Date(movement.data);
      const startDate = new Date(filterStartDate);
      if (movementDate < startDate) return false;
    }
    if (filterEndDate) {
      const movementDate = new Date(movement.data);
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      if (movementDate > endDate) return false;
    }
    return true;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Histórico de Movimentações", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Data de geração: ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);
    
    const tableData = filteredMovements.map((movement) => {
      const material = getMaterial(movement.materialId);
      return [
        formatDate(movement.data),
        getMovementLabel(movement.tipo),
        getMaterialName(movement.materialId),
        material?.categoria || "-",
        movement.quantidade.toString(),
        movement.responsavel,
        movement.observacao || "-"
      ];
    });

    autoTable(doc, {
      head: [["Data/Hora", "Tipo", "Material", "Categoria", "Qtd", "Responsável", "Observação"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105] },
    });

    doc.save(`movimentacoes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
            <SelectItem value="emprestimo">Empréstimo</SelectItem>
            <SelectItem value="devolucao">Devolução</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {availableCategories.map((categoria) => (
              <SelectItem key={categoria} value={categoria}>
                {categoria}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Filtrar por responsável..."
          value={filterResponsavel}
          onChange={(e) => setFilterResponsavel(e.target.value)}
        />

        <Input
          type="date"
          placeholder="Data inicial"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
        />

        <Input
          type="date"
          placeholder="Data final"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
        />

        <Button onClick={exportToPDF} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Foto</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-center">Quantidade</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredMovements.map((movement) => {
                const material = getMaterial(movement.materialId);
                return (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {material?.fotoUrl ? (
                        <img 
                          src={material.fotoUrl} 
                          alt={material.descricao}
                          className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage({ url: material.fotoUrl!, alt: material.descricao })}
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/48?text=Sem+Foto";
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          Sem foto
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(movement.data)}</TableCell>
                    <TableCell>
                      <Badge variant={getMovementVariant(movement.tipo)} className="gap-1">
                        {getMovementIcon(movement.tipo)}
                        {getMovementLabel(movement.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getMaterialName(movement.materialId)}</TableCell>
                    <TableCell>
                      {material?.categoria ? (
                        <Badge variant="outline">{material.categoria}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{movement.quantidade}</TableCell>
                    <TableCell>{movement.responsavel}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {movement.observacao || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(movement)}
                            title="Editar movimentação"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(movement)}
                            title="Excluir movimentação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
