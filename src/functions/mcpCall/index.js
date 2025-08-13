const { getContainer } = require("../../lib/cosmos");
const { v4: uuidv4 } = require("uuid");

function trimOrNull(s) { return typeof s === "string" ? s.trim() : null; }
function isEmail(s) { return /.+@.+\..+/.test(s); }

async function saveSubmission(args) {
  const name = trimOrNull(args.name);
  const email = trimOrNull(args.email)?.toLowerCase();
  const title = trimOrNull(args.title);
  const description = trimOrNull(args.description);

  const errors = [];
  if (!name) errors.push("name is required");
  if (!email || !isEmail(email)) errors.push("valid email is required");
  if (!title) errors.push("title is required");
  if (!description) errors.push("description is required");
  if (errors.length) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: errors.join(", ") } };
  }

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    name, email, title, description,
    createdAt: now,
    updatedAt: now
  };

  const container = await getContainer();
  await container.items.upsert(item, { disableAutomaticIdGeneration: true });
  return { ok: true, result: item };
}

async function listSubmissions(args) {
  const email = args && typeof args.email === "string" ? args.email.trim().toLowerCase() : null;
  const container = await getContainer();

  let querySpec;
  if (email) {
    querySpec = {
      query: "SELECT c.id, c.name, c.email, c.title, c.description, c.createdAt, c.updatedAt FROM c WHERE c.email = @e ORDER BY c.updatedAt DESC",
      parameters: [{ name: "@e", value: email }]
    };
  } else {
    querySpec = {
      query: "SELECT TOP 10 c.id, c.name, c.email, c.title, c.description, c.createdAt, c.updatedAt FROM c ORDER BY c.updatedAt DESC"
    };
  }

  const { resources } = await container.items.query(querySpec, { enableCrossPartitionQuery: true }).fetchAll();
  return { ok: true, result: { items: resources || [] } };
}

module.exports = async function (context, req) {
  try {
    const { tool, arguments: args } = req.body || {};
    if (!tool) {
      context.res = { status: 400, body: { error: { code: "BAD_REQUEST", message: "'tool' is required" } } };
      return;
    }

    if (tool === "save_submission") {
      const out = await saveSubmission(args || {});
      context.res = { status: out.ok ? 200 : 400, body: out.ok ? out.result : out };
      return;
    }

    if (tool === "list_submissions") {
      const out = await listSubmissions(args || {});
      context.res = { status: out.ok ? 200 : 400, body: out.ok ? out.result : out };
      return;
    }

    context.res = { status: 404, body: { error: { code: "UNKNOWN_TOOL", message: `No such tool: ${tool}` } } };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: { error: { code: "INTERNAL_ERROR", message: err.message } } };
  }
};
