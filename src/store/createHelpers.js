function createGraphqlRequest(fetch) {
  return async function graphqlRequest(query, variables) {
    const fetchConfig = {
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({query, variables}),
      credentials: 'include'
    }
    const res = await fetch('/graphql', fetchConfig)
    if (res.status !== 200) throw new Error(res.statusText)
    return res.json()
  }
}

export default function createHelpers({fetch, history}) {
  return {
    fetch,
    history,
    graphqlRequest: createGraphqlRequest(fetch)
  }
}
