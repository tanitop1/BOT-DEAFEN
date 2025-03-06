import Head from "next/head"

export default function Home() {
  return (
    <div>
      <Head>
        <title>Discord Deaf Detection Bot</title>
        <meta
          name="description"
          content="A Discord bot that detects when users deafen themselves and moves them to a specific channel"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Discord Deaf Detection Bot</h1>
        <p>This bot is running and listening for voice state updates.</p>
      </main>
    </div>
  )
}

