module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ ok: true }));
};


