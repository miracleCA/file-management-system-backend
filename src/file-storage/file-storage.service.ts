import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, CopyObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';



@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly client: S3Client;

  private readonly bucket: string;
  private readonly quarantineBucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION;
    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;

    const bucket = process.env.S3_BUCKET;
    const quarantineBucket = process.env.S3_QUARANTINE_BUCKET;

    if (!endpoint || !accessKey || !secretKey || !bucket || !quarantineBucket) throw new Error('Missing S3 configuration. Check S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET and S3_QUARANTINE_BUCKET.');

    this.bucket = bucket;
    this.quarantineBucket = quarantineBucket;

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },

      // Required for local MinIO/S3-compatible storage.
      forcePathStyle: true,
    });
  }


  async onModuleInit() {
    await this.ensureBucket(this.bucket);
    await this.ensureBucket(this.quarantineBucket);
  }

  private async ensureBucket(bucket: string) {
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: bucket,
        }),
      );

      console.log(`S3 bucket "${bucket}" already exists.`);

      return;
    } catch {
      console.log(`S3 bucket "${bucket}" does not exist. Creating it...`);
    }

    try {
      await this.client.send(
        new CreateBucketCommand({
          Bucket: bucket,
        }),
      );

      console.log(`S3 bucket "${bucket}" created successfully.`);
    } catch (error) {
      console.error(`Failed to create S3 bucket "${bucket}".`, error);

      throw new InternalServerErrorException(
        'Unable to initialize file storage.',
      );
    }
  }



  async createUploadUrl(storageKey: string, contentType?: string) {
    const command = new PutObjectCommand({
      Bucket: this.quarantineBucket,

      Key: storageKey,

      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: 900,
    });
  }

  async createDownloadUrl(storageKey: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,

      Key: storageKey,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: 900,
    });
  }

  async getQuarantineObjectMetadata(storageKey: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.quarantineBucket,

        Key: storageKey,
      });

      return await this.client.send(command);
    } catch {
      return null;
    }
  }

  async getProductionObjectMetadata(storageKey: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,

        Key: storageKey,
      });

      return await this.client.send(command);
    } catch {
      return null;
    }
  }

  async promoteToProduction(storageKey: string) {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,

        Key: storageKey,

        CopySource: `${this.quarantineBucket}/${storageKey}`,
      }),
    );

    const productionObject = await this.getProductionObjectMetadata(storageKey);

    if (!productionObject) {
      throw new Error(
        'File was not found in production storage after promotion.',
      );
    }

    return productionObject;
  }

  async deleteQuarantineObject(storageKey: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.quarantineBucket,

        Key: storageKey,
      }),
    );
  }

  async getObjectMetadata(storageKey: string) {
    return this.getProductionObjectMetadata(storageKey);
  }
}

