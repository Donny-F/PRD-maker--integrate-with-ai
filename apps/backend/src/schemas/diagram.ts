import { z } from "zod";

export const DiagramNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  phase: z.string().optional(),
  type: z.enum(["epic", "feature", "subfeature"]).default("feature"),
});

export const DiagramEdgeSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});

export const DiagramDataSchema = z.object({
  nodes: z.array(DiagramNodeSchema),
  edges: z.array(DiagramEdgeSchema),
});

export type DiagramData = z.infer<typeof DiagramDataSchema>;

export const ClarificationQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      context: z.string().optional(),
    })
  ),
});

export type ClarificationQuestions = z.infer<typeof ClarificationQuestionsSchema>;
