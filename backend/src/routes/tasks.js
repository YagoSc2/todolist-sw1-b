import { pool } from "../db.js";
const SELECT_FIELDS = "id, title, completed, due_date, created_at";
export default async function tasksRoutes(app) {
  // Rota para obter todas as tarefas com filtros de pesquisa e status
  app.get("/api/tasks", async (request, reply) => {
    const { search = "", status = "all" } = request.query;
    let sql = `SELECT ${SELECT_FIELDS} FROM tasks WHERE title LIKE ?`;
    const params = [`%${search}%`];
    if (status === "pending") {
      sql += " AND completed = 0";
    } else if (status === "completed") {
      sql += " AND completed = 1";
    }
    sql += " ORDER BY (due_date IS NULL), due_date ASC, created_at DESC";
    const [rows] = await pool.query(sql, params);
    const [[totals]] = await pool.query(
      "SELECT COUNT(*) AS total, SUM(completed = 1) AS completedCount FROM tasks WHERE title LIKE ?",
      params,
    );
    return reply.send({
      tasks: rows,
      total: totals.total,
      completed: Number(totals.completedCount) || 0,
    });
  });
  // cria a tarefa
  // POST /api/tasks { title, dueDate? }
  app.post("/api/tasks", async (request, reply) => {
    const { title, dueDate } = request.body ?? {};
    if (!title || !title.trim()) {
      return reply
        .status(400)
        .send({ message: "O nome da tarefa é obrigatório." });
    }
    const [result] = await pool.query(
      "INSERT INTO tasks (title, completed, due_date) VALUES (?, false, ?)",
      [title.trim(), dueDate || null],
    );
    const [[task]] = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM tasks WHERE id = ?`,
      [result.insertId],
    );
    return reply.status(201).send(task);
  });

  app.put("/api/tasks/:id", async (request, reply) => {
    const { id } = request.params;
    const { title, dueDate, completed } = request.body ?? {};
    const fields = [];
    const values = [];

    if (typeof title === "string" && title.trim()) {
      fields.push("title = ?");
      values.push(title.trim());
    }
    if (dueDate !== undefined) {
      fields.push("due_date = ?");
      values.push(dueDate || null);
    }
    if (completed !== undefined) {
      fields.push("completed = ?");
      values.push(completed ? 1 : 0);
    }
    if (fields.length === 0) {
      return reply.status(400).send({ message: "Nada para atualizar." });
    }

    values.push(id);
    const [result] = await pool.query(
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
    if (result.affectedRows === 0) {
      return reply.status(404).send({ message: "Tarefa não encontrada." });
    }
    const [[task]] = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM tasks WHERE id = ?`,
      [id],
    );
    return reply.send(task);
  });

  // DELETE /api/tasks/:id
app.delete('/api/tasks/:id', async (request, reply) => {
const { id } = request.params;
const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
if (result.affectedRows === 0) {
return reply.status(404).send({ message: 'Tarefa não encontrada.' });
}
return reply.status(204).send();
});
}

