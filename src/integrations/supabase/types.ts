export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string | null
          id: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_email: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_email: string
        }
        Update: {
          created_at?: string | null
          id?: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_email?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          categoria: string | null
          codigo: string
          created_at: string | null
          data_compra: string | null
          data_entrega: string | null
          descricao: string
          estoque_maximo: number | null
          estoque_minimo: number
          foto_url: string | null
          id: string
          localizacao: string
          obsoleto: boolean | null
          quantidade_atual: number
          status_compra: string | null
          tipo: string
          unidade_medida: string
          updated_at: string | null
          user_id: string
          valor_unitario: number | null
        }
        Insert: {
          categoria?: string | null
          codigo: string
          created_at?: string | null
          data_compra?: string | null
          data_entrega?: string | null
          descricao: string
          estoque_maximo?: number | null
          estoque_minimo?: number
          foto_url?: string | null
          id?: string
          localizacao: string
          obsoleto?: boolean | null
          quantidade_atual?: number
          status_compra?: string | null
          tipo: string
          unidade_medida?: string
          updated_at?: string | null
          user_id: string
          valor_unitario?: number | null
        }
        Update: {
          categoria?: string | null
          codigo?: string
          created_at?: string | null
          data_compra?: string | null
          data_entrega?: string | null
          descricao?: string
          estoque_maximo?: number | null
          estoque_minimo?: number
          foto_url?: string | null
          id?: string
          localizacao?: string
          obsoleto?: boolean | null
          quantidade_atual?: number
          status_compra?: string | null
          tipo?: string
          unidade_medida?: string
          updated_at?: string | null
          user_id?: string
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_view"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          created_at: string | null
          data: string | null
          foto_url: string | null
          id: string
          material_id: string
          observacao: string | null
          quantidade: number
          responsavel: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: string | null
          foto_url?: string | null
          id?: string
          material_id: string
          observacao?: string | null
          quantidade: number
          responsavel: string
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: string | null
          foto_url?: string | null
          id?: string
          material_id?: string
          observacao?: string | null
          quantidade?: number
          responsavel?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_history: {
        Row: {
          acao: string
          created_at: string | null
          id: string
          observacao: string | null
          pedido_id: string
          status_anterior: string | null
          status_novo: string | null
          usuario_id: string
        }
        Insert: {
          acao: string
          created_at?: string | null
          id?: string
          observacao?: string | null
          pedido_id: string
          status_anterior?: string | null
          status_novo?: string | null
          usuario_id: string
        }
        Update: {
          acao?: string
          created_at?: string | null
          id?: string
          observacao?: string | null
          pedido_id?: string
          status_anterior?: string | null
          status_novo?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_history_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          categoria: string | null
          created_at: string | null
          descricao: string
          id: string
          pedido_id: string
          quantidade: number
          unidade: string
          valor_estimado: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          pedido_id: string
          quantidade?: number
          unidade?: string
          valor_estimado?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          pedido_id?: string
          quantidade?: number
          unidade?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          aprovador_id: string | null
          centro_custo: string
          created_at: string | null
          data_necessidade: string | null
          id: string
          justificativa: string | null
          numero_pedido: string
          observacao: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["purchase_status"]
          updated_at: string | null
          urgencia: Database["public"]["Enums"]["purchase_urgency"]
        }
        Insert: {
          aprovador_id?: string | null
          centro_custo: string
          created_at?: string | null
          data_necessidade?: string | null
          id?: string
          justificativa?: string | null
          numero_pedido?: string
          observacao?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["purchase_status"]
          updated_at?: string | null
          urgencia?: Database["public"]["Enums"]["purchase_urgency"]
        }
        Update: {
          aprovador_id?: string | null
          centro_custo?: string
          created_at?: string | null
          data_necessidade?: string | null
          id?: string
          justificativa?: string | null
          numero_pedido?: string
          observacao?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          updated_at?: string | null
          urgencia?: Database["public"]["Enums"]["purchase_urgency"]
        }
        Relationships: []
      }
      purchase_quotations: {
        Row: {
          arquivo_url: string | null
          created_at: string | null
          fornecedor: string
          id: string
          observacao: string | null
          pedido_id: string
          selecionada: boolean | null
          validade: string | null
          valor_total: number
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string | null
          fornecedor: string
          id?: string
          observacao?: string | null
          pedido_id: string
          selecionada?: boolean | null
          validade?: string | null
          valor_total: number
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string | null
          fornecedor?: string
          id?: string
          observacao?: string | null
          pedido_id?: string
          selecionada?: boolean | null
          validade?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_quotations_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_profile_view: {
        Row: {
          created_at: string | null
          id: string | null
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_almoxarife: { Args: { _user_id: string }; Returns: boolean }
      is_compras: { Args: { _user_id: string }; Returns: boolean }
      is_diretor: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "compras" | "diretor" | "almoxarife"
      purchase_status:
        | "pedido"
        | "cotacao"
        | "aprovacao"
        | "comprado"
        | "cancelado"
      purchase_urgency: "baixa" | "normal" | "alta" | "critica"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "compras", "diretor", "almoxarife"],
      purchase_status: [
        "pedido",
        "cotacao",
        "aprovacao",
        "comprado",
        "cancelado",
      ],
      purchase_urgency: ["baixa", "normal", "alta", "critica"],
    },
  },
} as const
