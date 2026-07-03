import { NextResponse } from 'next/server'

export async function GET() {
  const appSiteAssociation = {
    applinks: {
      apps: [],
      details: [
        {
          appID: "739VNPUXRN.app.rork.1vx41jwdq3oy9ersn4acm",
          paths: ["/b/*", "/battle/*", "/join/*", "/duel/*", "/u/*"]
        }
      ]
    }
  }

  return NextResponse.json(appSiteAssociation, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}