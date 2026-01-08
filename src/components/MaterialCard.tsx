import { Material } from "@/types/material";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, AlertTriangle, Pencil, ArrowDownCircle, ArrowUpCircle, HandHelping, Undo2, Trash2, ShoppingCart, CheckCircle, Clock, XCircle } from "lucide-react";

interface MaterialCardProps {
  material: Material;
  onViewLocation: (material: Material) => void;
  onEdit: (material: Material) => void;
  onDelete: (material: Material) => void;
  onQuickAction?: (material: Material, action: "entrada" | "saida" | "emprestimo" | "devolucao") => void;
  onTogglePurchase?: (material: Material, newStatus: "pendente" | "em_cotacao" | "comprado") => void;
  onToggleObsolete?: (material: Material) => void;
  onAddToCart?: (material: Material) => void;
  onImageClick: (url: string, alt: string) => void;
  userRole?: "admin" | "compras" | "diretor" | "almoxarife" | "financeiro" | null;
}

export function MaterialCard({
  material,
  onViewLocation,
  onEdit,
  onDelete,
  onQuickAction,
  onTogglePurchase,
  onToggleObsolete,
  onAddToCart,
  onImageClick,
  userRole
}: MaterialCardProps) {
  const getStockStatus = (material: Material) => {
    if (material.obsoleto) {
      return { label: "Obsoleto", variant: "secondary" as const };
    }
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

  const status = getStockStatus(material);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header: Foto + Info básica */}
        <div className="flex gap-3 mb-3">
          {material.fotoUrl ? (
            <img
              src={material.fotoUrl}
              alt={material.descricao}
              className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
              onClick={() => onImageClick(material.fotoUrl!, material.descricao)}
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/64?text=Sem+Foto";
              }}
            />
          ) : (
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
              Sem foto
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{material.codigo}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{material.descricao}</p>
              </div>
              <Badge variant={status.variant} className="text-xs flex-shrink-0">
                {status.variant === "destructive" && <AlertTriangle className="h-3 w-3 mr-1" />}
                {status.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div className="bg-muted/50 rounded p-2 text-center">
            <p className="text-muted-foreground">Qtd</p>
            <p className="font-semibold">
              {material.tipo === "consumivel" ? "∞" : `${material.quantidadeAtual} ${material.unidadeMedida}`}
            </p>
          </div>
          <div className="bg-muted/50 rounded p-2 text-center">
            <p className="text-muted-foreground">Mín</p>
            <p className="font-semibold">{material.tipo === "consumivel" ? "-" : material.estoqueMinimo}</p>
          </div>
          <div className="bg-muted/50 rounded p-2 text-center">
            <p className="text-muted-foreground">Máx</p>
            <p className="font-semibold">{material.tipo === "consumivel" ? "-" : material.estoqueMaximo || "-"}</p>
          </div>
        </div>

        {/* Categoria e Local */}
        <div className="flex items-center justify-between gap-2 mb-3 text-xs">
          {material.categoria && (
            <Badge variant="outline" className="text-xs">{material.categoria}</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewLocation(material)}
            className="gap-1 text-xs h-7 px-2 ml-auto"
          >
            <MapPin className="h-3 w-3" />
            {material.localizacao}
          </Button>
        </div>

        {/* Valor */}
        {material.valorUnitario && (
          <div className="flex justify-between text-xs mb-3 border-t pt-2">
            <span className="text-muted-foreground">Valor Unit.: R$ {material.valorUnitario.toFixed(2)}</span>
            <span className="font-semibold">Total: R$ {(material.valorUnitario * material.quantidadeAtual).toFixed(2)}</span>
          </div>
        )}

        {/* Ações rápidas */}
        {onQuickAction && userRole !== "diretor" && userRole !== "compras" && (
          <div className="flex gap-2 mb-3">
            {material.tipo === "estoque" ? (
              <>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onQuickAction(material, "entrada")}
                  className="flex-1 gap-1"
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Entrada
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onQuickAction(material, "saida")}
                  className="flex-1 gap-1"
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Saída
                </Button>
              </>
            ) : material.tipo === "consumivel" ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onQuickAction(material, "saida")}
                className="flex-1 gap-1"
              >
                <ArrowUpCircle className="h-4 w-4" />
                Saída
              </Button>
            ) : (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onQuickAction(material, "emprestimo")}
                  className="flex-1 gap-1"
                >
                  <HandHelping className="h-4 w-4" />
                  Emprestar
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onQuickAction(material, "devolucao")}
                  className="flex-1 gap-1"
                >
                  <Undo2 className="h-4 w-4" />
                  Devolver
                </Button>
              </>
            )}
          </div>
        )}

        {/* Comprar */}
        {material.tipo !== "consumivel" && material.estoqueMaximo && material.estoqueMaximo > material.quantidadeAtual && onAddToCart && (status.variant === "destructive" || status.variant === "warning") && (
          <div className="flex items-center justify-between gap-2 mb-3 p-2 bg-primary/5 rounded">
            <span className="text-xs text-primary font-medium">
              Comprar: {material.estoqueMaximo - material.quantidadeAtual} un
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddToCart(material)}
              className="h-7 gap-1"
            >
              <ShoppingCart className="h-3 w-3" />
              Adicionar
            </Button>
          </div>
        )}

        {/* Ações de edição */}
        <div className="flex gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(material)}
            className="flex-1 gap-1"
            disabled={userRole === "diretor" || userRole === "compras"}
          >
            <Pencil className="h-3 w-3" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(material)}
            className="flex-1 gap-1"
            disabled={userRole === "diretor" || userRole === "compras"}
          >
            <Trash2 className="h-3 w-3" />
            Excluir
          </Button>
        </div>

        {/* Admin actions */}
        {userRole === "admin" && onToggleObsolete && (
          <Button
            variant={material.obsoleto ? "secondary" : "outline"}
            size="sm"
            onClick={() => onToggleObsolete(material)}
            className="w-full mt-2 gap-1"
          >
            <XCircle className="h-3 w-3" />
            {material.obsoleto ? "Ativar" : "Marcar Obsoleto"}
          </Button>
        )}

        {/* Purchase status */}
        {(userRole === "admin" || userRole === "compras") && onTogglePurchase && !material.obsoleto && (
          <div className="flex gap-1 mt-2">
            <Button
              variant={material.statusCompra === "pendente" ? "default" : "outline"}
              size="sm"
              onClick={() => onTogglePurchase(material, "pendente")}
              className="flex-1 gap-1"
            >
              <ShoppingCart className="h-3 w-3" />
              Pend.
            </Button>
            <Button
              variant={material.statusCompra === "em_cotacao" ? "default" : "outline"}
              size="sm"
              onClick={() => onTogglePurchase(material, "em_cotacao")}
              className="flex-1 gap-1"
            >
              <Clock className="h-3 w-3" />
              Cotação
            </Button>
            <Button
              variant={material.statusCompra === "comprado" ? "success" : "outline"}
              size="sm"
              onClick={() => onTogglePurchase(material, "comprado")}
              className="flex-1 gap-1"
            >
              <CheckCircle className="h-3 w-3" />
              Comprado
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
