import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

export type Sessao = {
  userId: number;
  tenantId: number;
  role: "admin" | "staff" | "customer";
};

declare global {
  namespace Express {
    interface Request {
      sessao?: Sessao;
      tenantId?: number;
    }
  }
}

function segredo() {
  const valor = process.env.JWT_SECRET;
  if (!valor) throw new Error("JWT_SECRET não definido.");
  return valor;
}

export function criarToken(sessao: Sessao) {
  return jwt.sign(sessao, segredo(), { expiresIn: "7d" });
}

export function autenticar(papeis?: Sessao["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ erro: "Autenticação necessária." });
    try {
      const sessao = z.object({
        userId: z.number(),
        tenantId: z.number(),
        role: z.enum(["admin", "staff", "customer"]),
      }).parse(jwt.verify(token, segredo()));
      if (papeis && !papeis.includes(sessao.role)) {
        return res.status(403).json({ erro: "Você não tem permissão para esta ação." });
      }
      req.sessao = sessao;
      req.tenantId = sessao.tenantId;
      next();
    } catch {
      return res.status(401).json({ erro: "Token inválido ou expirado." });
    }
  };
}
