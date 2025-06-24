import neo4j, { Driver } from "neo4j-driver";

let driver: Driver;

export function initNeo4j() {
  driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASS!)
  );
}

export function getSession() {
  if (!driver) throw new Error("Neo4j not initialized");
  return driver.session();
}
