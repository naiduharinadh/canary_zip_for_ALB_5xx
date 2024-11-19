const AWS = require('aws-sdk');

// Configure the AWS SDK
AWS.config.update({ region: 'us-east-1' });

// Create CloudWatch client
const cloudwatch = new AWS.CloudWatch();

exports.handler = async (event) => {
    try {
        // Set the time range for the last 5 minutes
        const endTime = new Date();
        const startTime = new Date(endTime - 5 * 60 * 1000);

        // Define the parameters for the CloudWatch query
        const params = {
            MetricName: 'HTTPCode_Target_5XX_Count',
            Namespace: 'AWS/ApplicationELB',
            Period: 300, // 5 minutes
            StartTime: startTime,
            EndTime: endTime,
            Statistics: ['Sum'],
            Dimensions: [
                {
                    Name: 'LoadBalancer',
                    Value: 'test-us-east-1' 
                }
            ]
        };

        // Get the metric statistics
        const data = await cloudwatch.getMetricStatistics(params).promise();

        // Check if there are any 5xx errors
        const errorCount = data.Datapoints.reduce((sum, datapoint) => sum + datapoint.Sum, 0);

        if (errorCount > 0) {
            console.log(`ALB 5xx Error Count: ${errorCount}`);
            throw new Error(`ALB returned ${errorCount} 5xx errors in the last 5 minutes`);
        } else {
            console.log('No 5xx errors detected');
            return {
                statusCode: 200,
                body: JSON.stringify('ALB health check passed'),
            };
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};
