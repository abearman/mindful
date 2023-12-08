/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const listImages = /* GraphQL */ `
  query ListImages($filter: ImageFilterInput, $limit: Int, $nextToken: String) {
    listImages(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        url
        prompt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
