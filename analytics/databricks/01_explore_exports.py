# Databricks notebook source
# GraphOrg sample analytics (WEB-225).
#
# Reads an exported JSONL file. Does not connect to Neon or Postgres.
# Databricks Free Edition is personal and non-commercial — not production analytics.
#
# Before Run all:
# 1. Generate analytics/exports/events.jsonl locally.
# 2. Upload that file to a Unity Catalog volume (Free Edition cannot download it).
# 3. Replace EVENTS_PATH with the volume path from the UI.

# COMMAND ----------

EVENTS_PATH = "/Volumes/<catalog>/default/graphorg/events.jsonl"

# COMMAND ----------

df = spark.read.json(EVENTS_PATH)
df.printSchema()
display(df.limit(20))

# COMMAND ----------

display(df.groupBy("event").count().orderBy("count", ascending=False))

# COMMAND ----------

display(
    df.filter(df.event == "page_view")
    .groupBy("path")
    .count()
    .orderBy("count", ascending=False)
)

# COMMAND ----------

display(
    df.filter(df.event == "ai_chat_completed")
    .groupBy("model_kind")
    .count()
    .orderBy("count", ascending=False)
)
