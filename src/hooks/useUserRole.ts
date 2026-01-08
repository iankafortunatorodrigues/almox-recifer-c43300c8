import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "admin" | "compras" | "diretor" | "almoxarife" | null;

// Priority order: admin > diretor > compras > almoxarife
const rolePriority: Record<string, number> = {
  admin: 4,
  diretor: 3,
  compras: 2,
  almoxarife: 1,
};

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching role:", error);
          setRole(null);
        } else if (data && data.length > 0) {
          // If user has multiple roles, pick the one with highest priority
          const highestRole = data.reduce((prev, curr) => {
            const prevPriority = rolePriority[prev.role] || 0;
            const currPriority = rolePriority[curr.role] || 0;
            return currPriority > prevPriority ? curr : prev;
          });
          setRole(highestRole.role as UserRole);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error("Error:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return { role, loading, isAdmin: role === "admin", isCompras: role === "compras", isDiretor: role === "diretor", isAlmoxarife: role === "almoxarife" };
}
