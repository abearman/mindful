import React, { useEffect, useState } from 'react';

import { downloadData, list } from 'aws-amplify/storage';
import axios from 'axios'; // using axios for fetching an image
import OpenAI from "openai";


function BackgroundImageGenerator() {
  const [imageURL, setImageURL] = useState(null);

  useEffect(() => {
    // This needs to be inside `useEffect` so we don't cause an infinite rendering loop in React
    console.log("Fetching new image ...");
    setImageURL(getRandomImageFromS3());
  }, []);

  // const AWS = require('aws-sdk');

  // AWS.config.update({
  //   region: 'us-west-2', // Replace with your desired region
  //   // other config parameters
  // });
  // const dynamoDb = new AWS.DynamoDB.DocumentClient();
  // const params = {
  //   TableName: 'background_images'
  // };

  // dynamoDb.scan(params, function(err, data) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     console.log(data);
  //   }
  // });

  async function addImage(url) {
    const image = {
      url: url,
      createdAt: new Date().toISOString(),
    };
    await API.graphql(graphqlOperation(createImage, { input: image }));
  }

  // Function to upload an image to S3 from a URL
  async function uploadImage(imageUrl, fileName) {
    try {
      // Fetch the image as a blob
      const response = await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'blob'
      });    

      const imageBlob = response.data;
      console.log("response: ", response);
      // Upload the blob to S3
      const result = await Storage.put(fileName, imageBlob, {
        contentType: imageBlob.type // Set the correct MIME type ('image/png')
      });

      console.log('Uploaded image:', result);
      return result;
      
    } catch (error) {
      console.error('Error uploading file from URL:', error);
      throw error;
    }
  }

  /* Function to fetch a new image from OpenAI */
  const generateNewImageFromDalle3 = async () => {
    const openai = new OpenAI(
      {
        apiKey: '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',
        dangerouslyAllowBrowser: true 
      }
    );

    try {
      const response = await openai.images.generate(
        {
          prompt: "inspiring photorealistic landscape image, with de-saturated colors",
          model: "dall-e-3",
          n: 1,
          response_format: "url",
          size: "1792x1024",
          style: "natural"
        }
      );
      
      console.log('New image fetched: ', response.data);
      return response.data[0].url;
    } catch (error) {
      console.error('Error fetching image:', error);
      return null;
    }
  };

  async function getRandomImageFromS3() {
    try {
      // List objects in the S3 bucket
      const storageListResult = await list({prefix: 'dalle3'});
      console.log("storageListResult: ", storageListResult);

      // Select a random object (image) from the list
      const randomIndex = Math.floor(Math.random() * storageListResult.length);
      const randomImageKey = storageListResult[randomIndex].key;

      // Get the URL of the random image
      const imageURL = await Storage.get(randomImageKey, { level: 'public' });

      setRandomImageURL(imageURL);
    } catch (error) {
      console.error('Error fetching random image:', error);
    }
  }

  return (
    <div className="image-container">
      <img src={imageURL} alt="Generated from OpenAI" />
    </div>
  );
}

export default BackgroundImageGenerator;