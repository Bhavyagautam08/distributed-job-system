import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import app from "../src/app.js";
import { pool } from "../src/config/database.js";

const testPrefix = `auth-e2e-${randomUUID()}-`;
const userCount = 10;
let server;
let baseUrl;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

async function request(path, { cookie, method = "GET", body, headers = {} } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
            ...(cookie ? { Cookie: cookie } : {}),
            ...headers
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    return {
        response,
        payload: await response.json()
    };
}

function sessionCookie(response) {
    const value = response.headers.get("set-cookie");
    assert.ok(value, "successful authentication should set a session cookie");
    assert.match(value, /^djs_session=[^;]+; HttpOnly/);
    assert.match(value, /SameSite=Lax/);
    return value.split(";", 1)[0];
}

after(async () => {
    await pool.query(
        `DELETE FROM outbox_events
         WHERE aggregate_id IN (
             SELECT id FROM jobs
             WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)
         )`,
        [`${testPrefix}%`]
    );
    await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`${testPrefix}%`]);
    if (server) {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
    await pool.end();
});

test("ten users can register, log in, and access only their own job data", async () => {
    const accounts = Array.from({ length: userCount }, (_, index) => ({
        email: `${testPrefix}${index}@example.test`,
        displayName: `Test User ${index}`,
        password: `Benchmark-Pass-${index}-Secure`
    }));

    const registrations = await Promise.all(accounts.map((account) =>
        request("/api/auth/register", { method: "POST", body: account })
    ));
    for (const { response, payload } of registrations) {
        assert.equal(response.status, 201);
        assert.ok(payload.user.id);
        assert.equal(payload.user.password_hash, undefined);
    }
    const registrationCookies = registrations.map(({ response }) => sessionCookie(response));

    const unauthenticated = await request("/api/jobs");
    assert.equal(unauthenticated.response.status, 401);
    const privateMetrics = await request("/api/metrics");
    assert.equal(privateMetrics.response.status, 401);

    const duplicate = await request("/api/auth/register", {
        method: "POST",
        body: { ...accounts[0], email: accounts[0].email.toUpperCase() }
    });
    assert.equal(duplicate.response.status, 409);

    const logins = await Promise.all(accounts.map(({ email, password }) =>
        request("/api/auth/login", { method: "POST", body: { email, password } })
    ));
    for (const { response } of logins) assert.equal(response.status, 200);
    const cookies = logins.map(({ response }) => sessionCookie(response));

    const profiles = await Promise.all(cookies.map((cookie) =>
        request("/api/auth/me", { cookie })
    ));
    for (let index = 0; index < profiles.length; index += 1) {
        assert.equal(profiles[index].response.status, 200);
        assert.equal(profiles[index].payload.user.email, accounts[index].email);
    }

    const jobs = await Promise.all(cookies.map((cookie, index) =>
        request("/api/jobs", {
            cookie,
            method: "POST",
            headers: { "Idempotency-Key": "same-key-per-user" },
            body: { type: "calculate_primes", payload: { maxLimit: 100 + index } }
        })
    ));
    for (const { response } of jobs) assert.equal(response.status, 201);
    const jobIds = jobs.map(({ payload }) => payload.job.id);
    assert.equal(new Set(jobIds).size, userCount);

    const privateJobRead = await request(`/api/jobs/${jobIds[1]}`, { cookie: cookies[0] });
    assert.equal(privateJobRead.response.status, 404);
    const ownJobRead = await request(`/api/jobs/${jobIds[0]}`, { cookie: cookies[0] });
    assert.equal(ownJobRead.response.status, 200);
    assert.equal(ownJobRead.payload.job.id, jobIds[0]);
    const privateJobUpdate = await request(`/api/jobs/${jobIds[1]}/cancel`, {
        cookie: cookies[0],
        method: "POST"
    });
    assert.equal(privateJobUpdate.response.status, 404);
    const ownJobUpdate = await request(`/api/jobs/${jobIds[0]}/cancel`, {
        cookie: cookies[0],
        method: "POST"
    });
    assert.equal(ownJobUpdate.response.status, 200);

    const privateLists = await Promise.all(cookies.map((cookie) => request("/api/jobs", { cookie })));
    for (let index = 0; index < privateLists.length; index += 1) {
        assert.equal(privateLists[index].response.status, 200);
        assert.equal(privateLists[index].payload.total, 1);
        assert.equal(privateLists[index].payload.jobs[0].id, jobIds[index]);
    }

    const dashboard = await request("/api/overview", { cookie: cookies[0] });
    assert.equal(dashboard.response.status, 200);
    assert.deepEqual(dashboard.payload.jobs.map((job) => job.id), [jobIds[0]]);
    const queueSnapshot = await request("/api/queues", { cookie: cookies[0] });
    assert.equal(queueSnapshot.response.status, 200);
    assert.ok(queueSnapshot.payload.events.length > 0);
    assert.ok(queueSnapshot.payload.events.every((event) => event.aggregate_id === jobIds[0]));

    const invalidLogin = await request("/api/auth/login", {
        method: "POST",
        body: { email: accounts[0].email, password: "incorrect-password" }
    });
    assert.equal(invalidLogin.response.status, 401);

    const logout = await request("/api/auth/logout", { cookie: cookies[0], method: "POST" });
    assert.equal(logout.response.status, 200);
    const revokedSession = await request("/api/auth/me", { cookie: cookies[0] });
    assert.equal(revokedSession.response.status, 401);
});
