import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

export type Papel = "admin" | "staff" | "customer" | "platform";

export type Sessao = {
  userId: number;
  tenantId: number;
  role: Papel;
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

const sessaoSchema = z.object({
  userId: z.number(),
  tenantId: z.number(),
  role: z.enum(["admin", "staff", "customer", "platform"]),
});

export function autenticar(papeis?: Papel[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ erro: "Autenticação necessária." });
    try {
      const sessao = sessaoSchema.parse(jwt.verify(token, segredo()));
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

export function credenciaisMaster() {
  const email = (process.env.MASTER_EMAIL ?? "master@encaixe.local").trim().toLowerCase();
  const password = (process.env.MASTER_PASSWORD ?? "Master@1234").trim();
  // MASTER_* vêm do .env (ou destes defaults em desenvolvimento).
  if (process.env.NODE_ENV === "production" && (!process.env.MASTER_EMAIL || !process.env.MASTER_PASSWORD)) {
    throw new Error("MASTER_EMAIL e MASTER_PASSWORD são obrigatórios em produção.");
  }
  return { email, password };
}
